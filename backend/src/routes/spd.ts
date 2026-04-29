import { Router, Request, Response } from 'express'
import * as fs   from 'fs'
import * as path from 'path'
import { computeSPD, computeStackSPD } from '../services/spd'

const DEFAULT_ENGINE  = (process.env.CALC_ENGINE   ?? 'webr') as 'webr' | 'python'
const PYTHON_API_URL  = process.env.PYTHON_API_URL  ?? 'http://localhost:8000'

// ── Carga del CSV ─────────────────────────────────────────────────────────────
// Misma estrategia que routes/calibration.ts: lectura única al arrancar el módulo.
// Las rutas de SPD usan "filemaker3" de app.R, que corresponde a las filas con
// Higiene in {1,2,3,4,5,6,7}.

interface CsvRow {
  IdMuestra:    string
  BP:           number
  SD:           number
  Yacimiento:   string
  Isla:         string
  Higiene:      number
  Vida:         string
  Adscripcion:  string
  Contexto_Est: string
  Material:     string
}

function loadCsv(): CsvRow[] {
  const csvPath = path.resolve(__dirname, '../../../database/Canarias.csv')
  const text    = fs.readFileSync(csvPath, 'utf-8')
  const lines   = text.trim().split('\n')
  const headers = lines[0].split(';').map(h => h.trim())
  const col     = (name: string) => headers.indexOf(name)

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const c       = lines[i].split(';')
    const id      = c[col('IdMuestra')]?.trim()
    const bp      = Number(c[col('BP')])
    const sd      = Number(c[col('SD')])
    const higiene = Number(c[col('Higiene')])
    if (!id || isNaN(bp) || isNaN(sd)) continue
    rows.push({
      IdMuestra:    id,
      BP:           bp,
      SD:           sd,
      Yacimiento:   c[col('Yacimiento')]?.trim()  ?? '',
      Isla:         c[col('Isla')]?.trim()         ?? '',
      Higiene:      higiene,
      Vida:         c[col('Vida')]?.trim()         ?? '',
      Adscripcion:  c[col('Adscripcion')]?.trim()  ?? '',
      Contexto_Est: c[col('Contexto_Est')]?.trim() ?? '',
      Material:     c[col('Material')]?.trim()     ?? '',
    })
  }
  return rows
}

// filemaker3 de app.R: rbind(H1..H7) → Higiene in {1..7}
const allRows    = loadCsv()
const filemaker3 = allRows.filter(r => r.Higiene >= 1 && r.Higiene <= 7)

const VALID_GROUP_COLS = ['Vida', 'Adscripcion', 'Contexto_Est', 'Material'] as const
type GroupCol = typeof VALID_GROUP_COLS[number]

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router()

// ── GET /api/spd/site/:yacimiento ─────────────────────────────────────────────
//
// Panel 3: SPD por yacimiento.
// Equivale a:
//   datos_spd_2 <- subset(filemaker3, Yacimiento == input$Yacimiento, c("BP","SD"))
//   Calib_matrix_2 <- calibrate(datos_spd_2$BP, datos_spd_2$SD)
//   sumprob_2 <- spd(Calib_matrix_2, timeRange=c(Inicio_spd, Final_spd))
//
// Parámetros de ruta:
//   :yacimiento — nombre del yacimiento (ej. "Acusa")
//
// Parámetros opcionales en query string:
//   ?calCurve=intcal20       (curva de calibración)
//   ?timeRangeStart=2500     (inicio en cal BP)
//   ?timeRangeEnd=250        (fin en cal BP)
//   ?runm=50                 (ventana de la media móvil en años)
//
// Responde con: { bcad, prob, smoothed, nDates }
//
router.get('/site/:yacimiento', async (req: Request, res: Response) => {
  const { yacimiento } = req.params
  const calCurve = (req.query.calCurve as string) ?? 'intcal20'
  const trStart  = Number(req.query.timeRangeStart ?? 2500)
  const trEnd    = Number(req.query.timeRangeEnd   ?? 250)
  const runm     = Number(req.query.runm            ?? 50)
  const engine   = (req.query.engine as string)    ?? DEFAULT_ENGINE

  const rows = filemaker3.filter(r => r.Yacimiento === yacimiento)
  if (rows.length === 0) {
    res.status(404).json({ error: `Yacimiento '${yacimiento}' no encontrado o sin fechas con Higiene 1-7` })
    return
  }

  try {
    if (engine === 'python') {
      // Express ya filtró las filas — pasa los arrays BP/SD directamente a FastAPI.
      // FastAPI acepta parámetros repetidos: ?bps=850&bps=900&sds=30&sds=25
      const qs = new URLSearchParams({
        calCurve,
        timeRangeStart: String(trStart),
        timeRangeEnd:   String(trEnd),
        runm:           String(runm),
      })
      rows.forEach(r => qs.append('bps', String(r.BP)))
      rows.forEach(r => qs.append('sds', String(r.SD)))

      const pyRes = await fetch(`${PYTHON_API_URL}/spd/site?${qs}`)
      if (!pyRes.ok) {
        const body = await pyRes.json().catch(() => ({})) as { detail?: string }
        res.status(pyRes.status).json({ error: body.detail ?? 'Error en el motor Python' })
        return
      }
      res.json(await pyRes.json())
      return
    }

    // Motor WebR (por defecto)
    const result = await computeSPD({
      bps:       rows.map(r => r.BP),
      sds:       rows.map(r => r.SD),
      timeRange: [trStart, trEnd],
      calCurve,
      runm,
    })
    res.json(result)
  } catch (err) {
    console.error(`[spd/site] Error para yacimiento ${yacimiento}:`, err)
    res.status(500).json({ error: 'Error interno al calcular el SPD' })
  }
})

// ── GET /api/spd/isla/:isla ───────────────────────────────────────────────────
//
// Panel 4: stackSPD por isla, subdividido por columna de grupo.
// Equivale a:
//   datos_spd_isla <- subset(filemaker3, Isla==input$Isla, c("BP","SD","Vida",...))
//   Calib_matrix_isla <- calibrate(datos_spd_isla$BP, datos_spd_isla$SD)
//   sumprob_isla <- stackspd(x=Calib_matrix_isla,
//                            group=datos_spd_isla$Vida,
//                            timeRange=c(Inicio_spd_isla, Final_spd_isla),
//                            bins=NA)
//
// Parámetros de ruta:
//   :isla — nombre de la isla (ej. "El Hierro")
//
// Parámetros opcionales:
//   ?group=Vida              (columna de agrupación: Vida | Adscripcion | Contexto_Est | Material)
//   ?calCurve=intcal20
//   ?timeRangeStart=2500
//   ?timeRangeEnd=250
//
// Responde con: { [grupo]: { bcad, prob } }
//
router.get('/isla/:isla', async (req: Request, res: Response) => {
  const { isla }  = req.params
  const calCurve  = (req.query.calCurve as string) ?? 'intcal20'
  const trStart   = Number(req.query.timeRangeStart ?? 2500)
  const trEnd     = Number(req.query.timeRangeEnd   ?? 250)
  const groupBy   = (req.query.group as string) ?? 'Vida'

  if (!VALID_GROUP_COLS.includes(groupBy as GroupCol)) {
    res.status(400).json({ error: `El parámetro group debe ser uno de: ${VALID_GROUP_COLS.join(', ')}` })
    return
  }

  const rows = filemaker3.filter(r => r.Isla === isla)
  if (rows.length === 0) {
    res.status(404).json({ error: `Isla '${isla}' no encontrada o sin fechas con Higiene 1-7` })
    return
  }

  const groups = rows.map(r => r[groupBy as GroupCol])
  const engine = (req.query.engine as string) ?? DEFAULT_ENGINE

  try {
    if (engine === 'python') {
      const qs = new URLSearchParams({
        calCurve,
        timeRangeStart: String(trStart),
        timeRangeEnd:   String(trEnd),
      })
      rows.forEach(r => qs.append('bps',    String(r.BP)))
      rows.forEach(r => qs.append('sds',    String(r.SD)))
      groups.forEach(g => qs.append('groups', g))

      const pyRes = await fetch(`${PYTHON_API_URL}/spd/isla?${qs}`)
      if (!pyRes.ok) {
        const body = await pyRes.json().catch(() => ({})) as { detail?: string }
        res.status(pyRes.status).json({ error: body.detail ?? 'Error en el motor Python' })
        return
      }
      res.json(await pyRes.json())
      return
    }

    // Motor WebR (por defecto)
    const result = await computeStackSPD({
      bps:       rows.map(r => r.BP),
      sds:       rows.map(r => r.SD),
      groups,
      timeRange: [trStart, trEnd],
      calCurve,
    })
    res.json(result)
  } catch (err) {
    console.error(`[spd/isla] Error para isla ${isla}:`, err)
    res.status(500).json({ error: 'Error interno al calcular el stackSPD' })
  }
})

// ── GET /api/spd/yacimientos ──────────────────────────────────────────────────
// Lista los yacimientos disponibles en filemaker3 (con Higiene 1-7)
// Útil para poblar el desplegable del Panel 3.
router.get('/yacimientos', (_req: Request, res: Response) => {
  const yacimientos = [...new Set(filemaker3.map(r => r.Yacimiento))].sort()
  res.json(yacimientos)
})

// ── GET /api/spd/islas ────────────────────────────────────────────────────────
// Lista las islas disponibles en filemaker3 (con Higiene 1-7)
// Útil para poblar el desplegable del Panel 4.
router.get('/islas', (_req: Request, res: Response) => {
  const islas = [...new Set(filemaker3.map(r => r.Isla))].sort()
  res.json(islas)
})

export default router
