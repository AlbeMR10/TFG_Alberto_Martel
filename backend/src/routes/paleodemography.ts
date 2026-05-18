import { Router, Request, Response } from 'express'
import { computePaleodemography } from '../services/paleodemography'
import { pool } from '../db'

const DEFAULT_ENGINE = (process.env.CALC_ENGINE   ?? 'webr') as 'webr' | 'python'
const PYTHON_API_URL = process.env.PYTHON_API_URL  ?? 'http://localhost:8000'

const VALID_MODELS = ['exponential', 'uniform', 'linear'] as const

// filemaker3 de app.R: Higiene in {1..7}
const HIGIENE_FILTER = 'AND m.higiene BETWEEN 1 AND 7'

const router = Router()

// ── GET /api/paleodemography/isla/:isla ───────────────────────────────────────
//
// Panel 5: modelTest por isla.
// Equivale a:
//   datos_modeltest <- subset(filemaker3, Isla==input$Paleo_Isla, c("Yacimiento","BP","SD"))
//   binning_isla <- binPrep(sites=datos_modeltest()$Yacimiento, ages=datos_modeltest()$BP, h=input$binning)
//   testeo_isla  <- modelTest(..., model=input$modelo_demografico, runm=input$media_movil_modelo)
//
router.get('/isla/:isla', async (req: Request, res: Response) => {
  const { isla } = req.params

  const trStart = Number(req.query.timeRangeStart ?? 2500)
  const trEnd   = Number(req.query.timeRangeEnd   ?? 250)
  const nsim    = Math.min(Number(req.query.nsim   ?? 100), 100)
  const runm    = Number(req.query.runm             ?? 50)
  const binH    = Number(req.query.binH             ?? 50)
  const model   = (req.query.model as string)       ?? 'exponential'

  if (!VALID_MODELS.includes(model as typeof VALID_MODELS[number])) {
    res.status(400).json({ error: `model debe ser uno de: ${VALID_MODELS.join(', ')}` })
    return
  }

  const [rows] = await pool.query(
    `SELECT m.bp AS BP, m.sd AS SD, y.nombre AS Yacimiento
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE y.isla = ? ${HIGIENE_FILTER}`,
    [isla]
  ) as [{ BP: number; SD: number; Yacimiento: string }[], unknown]

  if (rows.length === 0) {
    res.status(404).json({ error: `Isla '${isla}' no encontrada o sin fechas con Higiene 1-7` })
    return
  }

  const engine = (req.query.engine as string) ?? DEFAULT_ENGINE

  try {
    if (engine === 'python') {
      const qs = new URLSearchParams({ calCurve: 'intcal20', timeRangeStart: String(trStart), timeRangeEnd: String(trEnd), nsim: String(nsim), runm: String(runm), binH: String(binH), model })
      rows.forEach(r => qs.append('bps',   String(r.BP)))
      rows.forEach(r => qs.append('sds',   String(r.SD)))
      rows.forEach(r => qs.append('sites', r.Yacimiento))
      const pyRes = await fetch(`${PYTHON_API_URL}/paleodemography/isla?${qs}`)
      if (!pyRes.ok) {
        const body = await pyRes.json().catch(() => ({})) as { detail?: string }
        res.status(pyRes.status).json({ error: body.detail ?? 'Error en el motor Python' })
        return
      }
      res.json(await pyRes.json())
      return
    }

    const result = await computePaleodemography({
      bps:       rows.map(r => r.BP),
      sds:       rows.map(r => r.SD),
      sites:     rows.map(r => r.Yacimiento),
      timeRange: [trStart, trEnd],
      nsim, runm, binH, model,
    })
    res.json(result)
  } catch (err) {
    console.error(`[paleodemography] Error para isla ${isla}:`, err)
    res.status(500).json({ error: 'Error interno al ejecutar modelTest' })
  }
})

// ── GET /api/paleodemography/islas ────────────────────────────────────────────
router.get('/islas', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT y.isla AS isla
     FROM muestras m JOIN yacimientos y ON m.id_yacimiento = y.id
     WHERE m.higiene BETWEEN 1 AND 7 ORDER BY y.isla`
  ) as [{ isla: string }[], unknown]
  res.json(rows.map(r => r.isla))
})

export default router
