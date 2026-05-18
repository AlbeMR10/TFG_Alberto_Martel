import { Router, Request, Response } from 'express'
import { computeSPD, computeStackSPD } from '../services/spd'
import { pool } from '../db'

const DEFAULT_ENGINE  = (process.env.CALC_ENGINE   ?? 'webr') as 'webr' | 'python'
const PYTHON_API_URL  = process.env.PYTHON_API_URL  ?? 'http://localhost:8000'

interface SpdRow {
  BP:           number
  SD:           number
  Vida:         string
  Adscripcion:  string
  Contexto_Est: string
  Material:     string
}

const VALID_GROUP_COLS = ['Vida', 'Adscripcion', 'Contexto_Est', 'Material'] as const
type GroupCol = typeof VALID_GROUP_COLS[number]

// filemaker3 de app.R: Higiene in {1..7}
const HIGIENE_FILTER = 'AND m.higiene BETWEEN 1 AND 7'

const router = Router()

// ── GET /api/spd/site/:yacimiento ─────────────────────────────────────────────
//
// Panel 3: SPD por yacimiento.
// Equivale a:
//   datos_spd_2 <- subset(filemaker3, Yacimiento == input$Yacimiento, c("BP","SD"))
//   sumprob_2 <- spd(calibrate(datos_spd_2$BP, datos_spd_2$SD), timeRange=c(...))
//
router.get('/site/:yacimiento', async (req: Request, res: Response) => {
  const { yacimiento } = req.params
  const calCurve = (req.query.calCurve as string) ?? 'intcal20'
  const trStart  = Number(req.query.timeRangeStart ?? 2500)
  const trEnd    = Number(req.query.timeRangeEnd   ?? 250)
  const runm     = Number(req.query.runm            ?? 50)
  const engine   = (req.query.engine as string)    ?? DEFAULT_ENGINE

  const [rows] = await pool.query(
    `SELECT m.bp AS BP, m.sd AS SD
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE y.nombre = ? ${HIGIENE_FILTER}`,
    [yacimiento]
  ) as [{ BP: number; SD: number }[], unknown]

  if (rows.length === 0) {
    res.status(404).json({ error: `Yacimiento '${yacimiento}' no encontrado o sin fechas con Higiene 1-7` })
    return
  }

  try {
    if (engine === 'python') {
      const qs = new URLSearchParams({ calCurve, timeRangeStart: String(trStart), timeRangeEnd: String(trEnd), runm: String(runm) })
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

    const result = await computeSPD({ bps: rows.map(r => r.BP), sds: rows.map(r => r.SD), timeRange: [trStart, trEnd], calCurve, runm })
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
//   sumprob_isla <- stackspd(x=calibrate(...), group=datos$Vida, timeRange=c(...))
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

  const [rows] = await pool.query(
    `SELECT m.bp AS BP, m.sd AS SD,
            m.vida AS Vida, m.adscripcion AS Adscripcion,
            m.contexto_est AS Contexto_Est, m.material AS Material
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE y.isla = ? ${HIGIENE_FILTER}`,
    [isla]
  ) as [SpdRow[], unknown]

  if (rows.length === 0) {
    res.status(404).json({ error: `Isla '${isla}' no encontrada o sin fechas con Higiene 1-7` })
    return
  }

  const groups = rows.map(r => r[groupBy as GroupCol])
  const engine = (req.query.engine as string) ?? DEFAULT_ENGINE

  try {
    if (engine === 'python') {
      const qs = new URLSearchParams({ calCurve, timeRangeStart: String(trStart), timeRangeEnd: String(trEnd) })
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

    const result = await computeStackSPD({ bps: rows.map(r => r.BP), sds: rows.map(r => r.SD), groups, timeRange: [trStart, trEnd], calCurve })
    res.json(result)
  } catch (err) {
    console.error(`[spd/isla] Error para isla ${isla}:`, err)
    res.status(500).json({ error: 'Error interno al calcular el stackSPD' })
  }
})

// ── GET /api/spd/yacimientos ──────────────────────────────────────────────────
router.get('/yacimientos', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT y.nombre AS nombre
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE m.higiene BETWEEN 1 AND 7 ORDER BY y.nombre`
  ) as [{ nombre: string }[], unknown]
  res.json(rows.map(r => r.nombre))
})

// ── GET /api/spd/islas ────────────────────────────────────────────────────────
router.get('/islas', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT y.isla AS isla
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE m.higiene BETWEEN 1 AND 7 ORDER BY y.isla`
  ) as [{ isla: string }[], unknown]
  res.json(rows.map(r => r.isla))
})

export default router
