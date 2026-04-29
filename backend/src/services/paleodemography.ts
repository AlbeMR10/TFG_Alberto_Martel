import { execFile }   from 'child_process'
import * as os        from 'os'
import * as fsNode    from 'fs/promises'
import * as pathNode  from 'path'

// ── Interfaces ────────────────────────────────────────────────────────────────

// Panel 5: paleodemografía — equivale a binPrep() + modelTest() de rcarbon.
// Inputs del usuario en app.R:
//   - Isla, Inicio/Final, modelo demográfico, nsim, runm, h (binning)
export interface PaleodemographyParams {
  bps:        number[]
  sds:        number[]
  sites:      string[]     // Yacimiento de cada fecha — para binPrep()
  timeRange?: [number, number]
  calCurve?:  string
  nsim?:      number       // simulaciones Monte Carlo; app.R lo limita a 100
  runm?:      number       // ventana media móvil para suavizar el SPD
  binH?:      number       // h de binPrep: radio de agrupación en años BP
  model?:     string       // 'exponential' | 'uniform' | 'linear'
}

export interface PaleodemographyResult {
  // Eje X común a las dos gráficas (vacío — las gráficas las genera R directamente)
  bcad:        number[]

  // ── Gráfica 1: SPD observado vs envelope (output$demo_test_isla) ──────────
  spdObs:      number[]
  envelopeHi:  number[]
  envelopeLo:  number[]
  fitModel:    number[]
  positiveDev: number[]
  negativeDev: number[]

  // ── Gráfica 2: Rate of Change (output$testeo_change) ─────────────────────
  rocObs:      number[]
  rocHi:       number[]
  rocLo:       number[]
  rocPosDev:   number[]
  rocNegDev:   number[]

  // Metadatos
  nDates:      number
  nBins:       number
  pVal:        number

  // Imágenes generadas por R (base64 PNG)
  spdPlot:     string
  rocPlot:     string
}

// ── helpers ───────────────────────────────────────────────────────────────────

function toRVec(arr: number[]): string {
  return `c(${arr.join(',')})`
}

function toRStrVec(arr: string[]): string {
  return `c(${arr.map(s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`
}

// ── computeViaRscript ─────────────────────────────────────────────────────────
// Usa Rscript (R nativo del sistema) para ejecutar modelTest() sin restricciones
// de WebAssembly. Genera los plots con plot.SpdModelTest() de rcarbon, idénticos
// a los de app.R. Devuelve los PNGs como base64 + pVal y nBins del resultado.
async function computeViaRscript(
  bps: number[], sds: number[], sites: string[],
  trMax: number, trMin: number,
  calCurve: string, nsimCap: number, runm: number, binH: number, model: string,
): Promise<{ spdPlot: string; rocPlot: string; pVal: number; nBins: number }> {
  const id         = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const tmpDir     = os.tmpdir()
  const scriptPath = pathNode.join(tmpDir, `paleo_${id}.R`)
  const spdPath    = pathNode.join(tmpDir, `paleo_spd_${id}.png`)
  const rocPath    = pathNode.join(tmpDir, `paleo_roc_${id}.png`)

  const script = `
suppressPackageStartupMessages(library(rcarbon))
.bins   <- binPrep(sites = ${toRStrVec(sites)}, ages = ${toRVec(bps)}, h = ${binH})
.cal    <- calibrate(${toRVec(bps)}, ${toRVec(sds)},
                     calCurves = "${calCurve}", normalised = FALSE, verbose = FALSE)
.testeo <- modelTest(.cal, errors = ${toRVec(sds)}, bins = .bins,
                     nsim = ${nsimCap}, timeRange = c(${trMax}, ${trMin}),
                     model = "${model}", runm = ${runm},
                     ncores = 1, verbose = FALSE)
png("${spdPath.replace(/\\/g, '/')}", width = 900, height = 500, res = 96)
par(mai = rep(0.64, 4))
plot(.testeo, main = "Testeo contra modelos de crecimiento teóricos")
lines(.testeo$fit$calBP, .testeo$fit$PrDens, type = "l", lty = 2, col = "red")
dev.off()
png("${rocPath.replace(/\\/g, '/')}", width = 900, height = 450, res = 96)
par(mai = rep(0.64, 4))
plot(.testeo, type = "roc", main = "Testeo de los ratios de crecimiento locales")
dev.off()
cat(sprintf("PVAL=%g\\nNBINS=%d\\n",
            as.numeric(.testeo$pval)[1],
            length(unique(.bins))))
`

  await fsNode.writeFile(scriptPath, script)
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile('Rscript', ['--no-save', '--no-restore', scriptPath],
        { timeout: 600_000 },   // 10 min máximo
        (err, out, stderr) => {
          if (err) reject(new Error(stderr || err.message))
          else resolve(out)
        })
    })

    const pVal  = parseFloat(stdout.match(/PVAL=([^\n\r]+)/)?.[1]  ?? 'NaN')
    const nBins = parseInt  (stdout.match(/NBINS=(\d+)/)?.[1] ?? '0', 10)

    const [spdBuf, rocBuf] = await Promise.all([
      fsNode.readFile(spdPath),
      fsNode.readFile(rocPath),
    ])
    return {
      spdPlot: spdBuf.toString('base64'),
      rocPlot: rocBuf.toString('base64'),
      pVal, nBins,
    }
  } finally {
    await Promise.all([
      fsNode.unlink(scriptPath).catch(() => {}),
      fsNode.unlink(spdPath).catch(() => {}),
      fsNode.unlink(rocPath).catch(() => {}),
    ])
  }
}

// ── computePaleodemography ────────────────────────────────────────────────────
//
// Equivale al bloque del Panel 5 de app.R:
//
//   binning_isla <- binPrep(sites=datos_modeltest()$Yacimiento,
//                           ages=datos_modeltest()$BP, h=input$binning)
//
//   dataciones_matrix_cal <- calibrate(datos_modeltest()$BP, datos_modeltest()$SD,
//                                      normalised=FALSE)
//
//   testeo_isla <- modelTest(dataciones_matrix_cal, errors=datos_modeltest()$SD,
//                            bins=binning_isla, nsim=min(input$simulaciones, 100),
//                            timeRange=c(...), model=input$modelo_demografico,
//                            runm=input$media_movil_modelo)
//
// Las gráficas las genera R directamente (plot.SpdModelTest); el frontend
// solo muestra los PNGs en base64.
//
export async function computePaleodemography(params: PaleodemographyParams): Promise<PaleodemographyResult> {
  const {
    bps,
    sds,
    sites,
    timeRange = [2500, 250],
    calCurve  = 'intcal20',
    nsim      = 100,
    runm      = 50,
    binH      = 50,
    model     = 'exponential',
  } = params

  const trMax   = Math.max(...timeRange)
  const trMin   = Math.min(...timeRange)
  const nsimCap = Math.min(nsim, 100)   // igual que app.R

  const r = await computeViaRscript(
    bps, sds, sites, trMax, trMin, calCurve, nsimCap, runm, binH, model
  )

  return {
    // Los vectores numéricos están vacíos — el frontend usa solo los PNGs
    bcad: [], spdObs: [], envelopeHi: [], envelopeLo: [], fitModel: [],
    positiveDev: [], negativeDev: [],
    rocObs: [], rocHi: [], rocLo: [], rocPosDev: [], rocNegDev: [],
    nDates:  bps.length,
    nBins:   r.nBins,
    pVal:    r.pVal,
    spdPlot: r.spdPlot,
    rocPlot: r.rocPlot,
  }
}
