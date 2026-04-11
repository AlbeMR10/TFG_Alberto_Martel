import { Router, Request, Response } from 'express'
import * as fs   from 'fs'
import * as path from 'path'
import { calibrate, CalibrationParams } from '../services/calibration'

// ── Carga del CSV ─────────────────────────────────────────────────────────────
// TEMPORAL: mientras no hay base de datos MySQL, leemos directamente el CSV.
// Cuando se monte MySQL, sustituir esta sección por:
//   import { getDb } from '../db/connection'
//   const [rows] = await getDb().query('SELECT BP, SD FROM muestras WHERE IdMuestra = ?', [idMuestra])
//
// Cargamos el CSV una sola vez al arrancar el módulo (no en cada petición).
// Así no leemos el disco 100 veces si llegan 100 peticiones seguidas.
//
// El CSV usa separador ; y tiene cabecera en la primera fila.
// Columnas que usamos: IdMuestra, BP, SD

interface MuestraRow {
  IdMuestra: string
  BP:        number
  SD:        number
}

function loadCsv(): Map<string, MuestraRow> {
  const csvPath = path.resolve(__dirname, '../../../database/Canarias.csv')
  const text    = fs.readFileSync(csvPath, 'utf-8')
  const lines   = text.trim().split('\n')

  // Primera línea = cabecera
  const headers = lines[0].split(';').map(h => h.trim())
  const iId = headers.indexOf('IdMuestra')
  const iBP = headers.indexOf('BP')
  const iSD = headers.indexOf('SD')

  const map = new Map<string, MuestraRow>()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';')
    const id   = cols[iId]?.trim()
    const bp   = Number(cols[iBP])
    const sd   = Number(cols[iSD])
    if (id && !isNaN(bp) && !isNaN(sd)) {
      map.set(id, { IdMuestra: id, BP: bp, SD: sd })
    }
  }

  return map
}

// Se ejecuta una vez cuando Node.js carga este módulo
const muestrasMap = loadCsv()

// ── Router ────────────────────────────────────────────────────────────────────
// Se monta en app.use('/api', calibrationRouter) dentro de index.ts,
// así el endpoint final queda: GET /api/calibrate/:idMuestra
const router = Router()

// ── GET /api/calibrate/:idMuestra ─────────────────────────────────────────────
//
// Equivalente al bloque reactivo de app.R:
//   datos <- reactive({ subset(filemaker, IdMuestra == input$Datacion, c("BP","SD")) })
//   acalibrar <- calibrate(datos()$BP, datos()$SD, ...)
//
// Parámetros de ruta:
//   :idMuestra — identificador de la muestra, ej. "Beta-539739"
//
// Parámetros opcionales en query string (todos tienen valor por defecto):
//   ?calCurve=intcal20   (o intcal13, marine20, marine13)
//   ?resOffset=0         (DeltaR — corrección marina)
//   ?resError=0          (error del DeltaR)
//   ?normalised=false    (normalizar probabilidad)
//
// Ejemplos de llamada desde el frontend:
//   fetch('/api/calibrate/Beta-539739')
//   fetch('/api/calibrate/Beta-539739?calCurve=marine20&resOffset=150&resError=30')
//
router.get('/:idMuestra', async (req: Request, res: Response) => {
  const { idMuestra } = req.params

  // ── 1. Leer parámetros opcionales del query string ────────────────────────
  const params: CalibrationParams = {
    bp:         0,   // se sobreescribe con el valor del CSV (o MySQL en el futuro)
    sd:         0,
    calCurve:   (req.query.calCurve as string) ?? 'intcal20',
    resOffset:  Number(req.query.resOffset  ?? 0),
    resError:   Number(req.query.resError   ?? 0),
    normalised: req.query.normalised === 'true',
  }

  try {
    // ── 2. Buscar la muestra en el CSV ────────────────────────────────────────
    // TEMPORAL — reemplazar por query MySQL cuando esté disponible
    const muestra = muestrasMap.get(idMuestra)

    if (!muestra) {
      res.status(404).json({ error: `Muestra '${idMuestra}' no encontrada` })
      return
    }

    // ── 3. Llamar al servicio de calibración ──────────────────────────────────
    // El servicio solo recibe números, no sabe nada de HTTP ni de CSV.
    params.bp = muestra.BP
    params.sd = muestra.SD

    const result = await calibrate(params)

    // ── 4. Devolver el resultado al frontend ──────────────────────────────────
    // Express serializa el objeto a JSON automáticamente.
    // El frontend recibirá: { bcad, prob, inHpd1, inHpd2, median,
    //                         curveBcad, curveC14, curveError }
    res.json(result)

  } catch (err) {
    console.error(`[calibration route] Error para muestra ${idMuestra}:`, err)
    res.status(500).json({ error: 'Error interno al calibrar la muestra' })
  }
})

export default router
