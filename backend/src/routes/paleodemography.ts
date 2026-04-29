import { Router, Request, Response } from 'express'
import * as fs   from 'fs'
import * as path from 'path'
import { computePaleodemography } from '../services/paleodemography'

const DEFAULT_ENGINE = (process.env.CALC_ENGINE   ?? 'webr') as 'webr' | 'python'
const PYTHON_API_URL = process.env.PYTHON_API_URL  ?? 'http://localhost:8000'

// ── Carga del CSV ─────────────────────────────────────────────────────────────
// Misma estrategia que las otras rutas: lectura única al arrancar el módulo.
// Panel 5 usa filemaker3 (Higiene 1-7) filtrado por Isla, igual que en app.R:
//   datos_modeltest <- subset(filemaker3, Isla==input$Paleo_Isla, c("Yacimiento","BP","SD"))

interface CsvRow {
  IdMuestra:  string
  BP:         number
  SD:         number
  Yacimiento: string
  Isla:       string
  Higiene:    number
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
      IdMuestra:  id,
      BP:         bp,
      SD:         sd,
      Yacimiento: c[col('Yacimiento')]?.trim() ?? '',
      Isla:       c[col('Isla')]?.trim()        ?? '',
      Higiene:    higiene,
    })
  }
  return rows
}

// filemaker3: Higiene in {1..7}
const allRows    = loadCsv()
const filemaker3 = allRows.filter(r => r.Higiene >= 1 && r.Higiene <= 7)

const VALID_MODELS = ['exponential', 'uniform', 'linear'] as const

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router()

// ── GET /api/paleodemography/isla/:isla ───────────────────────────────────────
//
// Panel 5: modelTest por isla.
// Equivale al bloque completo de output$demo_test_isla + output$testeo_change:
//
//   binning_isla <- binPrep(sites=datos_modeltest()$Yacimiento,
//                           ages=datos_modeltest()$BP, h=input$binning)
//   dataciones_matrix_cal <- calibrate(..., normalised=FALSE, calMatrix=TRUE)
//   testeo_isla <- modelTest(..., nsim=min(input$simulaciones,100),
//                            model=input$modelo_demografico, runm=input$media_movil_modelo)
//
// Parámetros de ruta:
//   :isla — nombre de la isla (ej. "El Hierro")
//
// Parámetros opcionales en query string:
//   ?timeRangeStart=2500    (inicio en cal BP)
//   ?timeRangeEnd=250       (fin en cal BP)
//   ?nsim=100               (simulaciones Monte Carlo, se limita a 100)
//   ?runm=50                (ventana media móvil para el SPD)
//   ?binH=50                (h de binPrep: radio de agrupación en años)
//   ?model=exponential      (modelo demográfico: exponential | uniform | linear)
//
// Responde con:
//   { bcad, spdObs, envelopeHi, envelopeLo, fitModel,
//     positiveDev, negativeDev,
//     rocObs, rocHi, rocLo, rocPosDev, rocNegDev,
//     nDates, nBins, pVal }
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

  const rows = filemaker3.filter(r => r.Isla === isla)
  if (rows.length === 0) {
    res.status(404).json({ error: `Isla '${isla}' no encontrada o sin fechas con Higiene 1-7` })
    return
  }

  const engine = (req.query.engine as string) ?? DEFAULT_ENGINE

  try {
    if (engine === 'python') {
      const qs = new URLSearchParams({
        calCurve:       'intcal20',
        timeRangeStart: String(trStart),
        timeRangeEnd:   String(trEnd),
        nsim:           String(nsim),
        runm:           String(runm),
        binH:           String(binH),
        model,
      })
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
      nsim,
      runm,
      binH,
      model,
    })
    res.json(result)
  } catch (err) {
    console.error(`[paleodemography] Error para isla ${isla}:`, err)
    res.status(500).json({ error: 'Error interno al ejecutar modelTest' })
  }
})

// ── GET /api/paleodemography/islas ────────────────────────────────────────────
// Lista las islas disponibles en filemaker3.
// Reutiliza la misma lógica que /api/spd/islas pero desde este módulo.
router.get('/islas', (_req: Request, res: Response) => {
  const islas = [...new Set(filemaker3.map(r => r.Isla))].sort()
  res.json(islas)
})

export default router
