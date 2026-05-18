import { Router, Request, Response } from 'express'
import { calibrate, CalibrationParams } from '../services/calibration'
import { pool } from '../db'

// Motor de cálculo por defecto: se puede sobreescribir con ?engine=python
// o cambiar globalmente con la variable de entorno CALC_ENGINE.
const DEFAULT_ENGINE = (process.env.CALC_ENGINE ?? 'webr') as 'webr' | 'python'

// URL del servidor FastAPI Python (arranca aparte con uvicorn)
const PYTHON_API_URL = process.env.PYTHON_API_URL ?? 'http://localhost:8000'

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
  const calCurve   = (req.query.calCurve  as string) ?? 'intcal20'
  const resOffset  = Number(req.query.resOffset  ?? 0)
  const resError   = Number(req.query.resError   ?? 0)
  const normalised = req.query.normalised === 'true'

  // ?engine=python sobreescribe CALC_ENGINE para esta petición concreta.
  // Útil para comparar los dos motores con la misma muestra sin reiniciar.
  const engine = (req.query.engine as string) ?? DEFAULT_ENGINE

  try {
    // ── 2. Buscar la muestra en la base de datos ──────────────────────────────
    const [rows] = await pool.query(
      'SELECT bp AS BP, sd AS SD FROM muestras WHERE id_muestra_lab = ?',
      [idMuestra]
    ) as [{ BP: number; SD: number }[], unknown]

    if (rows.length === 0) {
      res.status(404).json({ error: `Muestra '${idMuestra}' no encontrada` })
      return
    }
    const muestra = rows[0]

    // ── 3. Llamar al motor de calibración ─────────────────────────────────────

    if (engine === 'python') {
      // ── Motor Python: proxy al servidor FastAPI ──────────────────────────
      // FastAPI corre en localhost:8000 (arrancado aparte con uvicorn).
      // El JSON que devuelve es idéntico al del motor WebR.
      const qs = new URLSearchParams({
        bp:         String(muestra.BP),
        sd:         String(muestra.SD),
        calCurve,
        resOffset:  String(resOffset),
        resError:   String(resError),
        normalised: String(normalised),
      })
      const pyRes = await fetch(`${PYTHON_API_URL}/calibrate?${qs}`)
      if (!pyRes.ok) {
        const body = await pyRes.json().catch(() => ({})) as { detail?: string }
        res.status(pyRes.status).json({ error: body.detail ?? 'Error en el motor Python' })
        return
      }
      res.json(await pyRes.json())
      return
    }

    // ── Motor WebR (por defecto) ──────────────────────────────────────────
    const params: CalibrationParams = {
      bp: muestra.BP, sd: muestra.SD,
      calCurve, resOffset, resError, normalised,
    }
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
