import { runR, getRVector } from './webr'

// ── Interfaces ────────────────────────────────────────────────────────────────

// Panel 3: SPD por yacimiento — equivalente a rcarbon::spd()
//   spd(calibrate(BP, SD), timeRange=c(2500,250))
export interface SPDParams {
  bps:         number[]
  sds:         number[]
  timeRange?:  [number, number]   // [calBP_inicio, calBP_fin], ej. [2500, 250]
  calCurve?:   string             // 'intcal20' | 'intcal13' | 'marine20' | 'marine13'
  runm?:       number             // ventana de la media móvil en años, default 50
  normalised?: boolean
}

export interface SPDResult {
  bcad:     number[]   // eje X en BC/AD
  prob:     number[]   // densidad de probabilidad sumada (SPD en bruto)
  smoothed: number[]   // SPD suavizada con media móvil (lo que R dibuja en azul)
  nDates:   number     // número de fechas incluidas
}

// Panel 4: SPD por isla subdividido por grupo — equivalente a rcarbon::stackspd()
//   stackspd(x=calibrate(BP,SD), group=datos$Vida, timeRange=..., bins=NA)
export interface StackSPDParams {
  bps:        number[]
  sds:        number[]
  groups:     string[]           // vector de categorías (Vida, Adscripcion, etc.)
  timeRange?: [number, number]
  calCurve?:  string
}

// Un objeto cuyas claves son los nombres de grupo y los valores son el SPD de ese grupo
export interface StackSPDResult {
  [group: string]: {
    bcad: number[]
    prob: number[]
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRVec(arr: number[]): string {
  return `c(${arr.join(',')})`
}

function toRStrVec(arr: string[]): string {
  return `c(${arr.map(s => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`
}

// ── computeSPD ────────────────────────────────────────────────────────────────
// Equivale al bloque del Panel 3 de app.R:
//   Calib_matrix_2 <- calibrate(datos_spd_2()$BP, datos_spd_2()$SD)
//   sumprob_2      <- spd(Calib_matrix_2, timeRange=c(input$Inicio_spd, input$Final_spd))
//   plot(sumprob_2, fill="red")
//   plot(sumprob_2, runm=input$media_movil, add=TRUE, type="simple", col="blue")
export async function computeSPD(params: SPDParams): Promise<SPDResult> {
  const {
    bps,
    sds,
    timeRange  = [2500, 250],
    calCurve   = 'intcal20',
    runm       = 50,
    normalised = true,   // R usa normalised=TRUE por defecto en calibrate() para SPD
  } = params

  const trMax = Math.max(...timeRange)
  const trMin = Math.min(...timeRange)

  await runR(`
    suppressPackageStartupMessages(library(rcarbon))

    # rcarbon::calibrate() — igual que app.R Panel 3
    .cal <- calibrate(
      ${toRVec(bps)}, ${toRVec(sds)},
      calCurves  = "${calCurve}",
      normalised = ${normalised ? 'TRUE' : 'FALSE'}
    )

    # rcarbon::spd() — suma las distribuciones calibradas en el rango temporal
    .spd  <- spd(.cal, timeRange = c(${trMax}, ${trMin}))
    .bcad <- as.numeric(1950 - .spd$grid$calBP)
    .prob <- as.numeric(.spd$grid$PrDens)

    # Media móvil — igual que plot.CalSPD de rcarbon: circular=TRUE evita NAs en extremos
    .smoothed <- as.numeric(stats::filter(.prob, rep(1 / ${runm}, ${runm}), circular = TRUE))

    invisible(NULL)
  `)

  const [bcad, prob, smoothed] = await Promise.all([
    getRVector('.bcad'),
    getRVector('.prob'),
    getRVector('.smoothed'),
  ])

  return { bcad, prob, smoothed, nDates: bps.length }
}

// ── computeStackSPD ───────────────────────────────────────────────────────────
// Equivale al bloque del Panel 4 de app.R:
//   Calib_matrix_isla <- calibrate(datos_spd_isla()$BP, datos_spd_isla()$SD)
//   sumprob_isla <- stackspd(x=Calib_matrix_isla, group=datos_spd_isla()$Vida, ...)
//   plot(sumprob_isla, type='multipanel', calendar="BCAD")
//
// En lugar de usar stackspd() y depender de su estructura interna ($result[[g]]$grid),
// calibramos todas las fechas una vez y llamamos a spd() por grupo subseteando
// CalDates con [.mask]. Mismo resultado, independiente de la versión de rcarbon.
export async function computeStackSPD(params: StackSPDParams): Promise<StackSPDResult> {
  const {
    bps,
    sds,
    groups,
    timeRange = [2500, 250],
    calCurve  = 'intcal20',
  } = params

  const trMax        = Math.max(...timeRange)
  const trMin        = Math.min(...timeRange)
  const uniqueGroups = [...new Set(groups)].sort()

  // Calibrar todas las fechas una sola vez y guardar el vector de grupos en R
  await runR(`
    suppressPackageStartupMessages(library(rcarbon))
    .cal    <- calibrate(
      ${toRVec(bps)}, ${toRVec(sds)},
      calCurves  = "${calCurve}",
      normalised = TRUE
    )
    .groups <- ${toRStrVec(groups)}
    invisible(NULL)
  `)

  // Para cada grupo: subsetear CalDates con [.mask] y calcular spd()
  const result: StackSPDResult = {}

  for (const grp of uniqueGroups) {
    const safe = grp.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    await runR(`
      .mask    <- .groups == "${safe}"
      .calGrp  <- .cal[.mask]
      .spdGrp  <- spd(.calGrp, timeRange = c(${trMax}, ${trMin}))
      .grpBcad <- as.numeric(1950 - .spdGrp$grid$calBP)
      .grpProb <- as.numeric(.spdGrp$grid$PrDens)
      invisible(NULL)
    `)
    const [bcad, prob] = await Promise.all([
      getRVector('.grpBcad'),
      getRVector('.grpProb'),
    ])
    result[grp] = { bcad, prob }
  }

  return result
}
