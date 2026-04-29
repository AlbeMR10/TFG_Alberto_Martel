import { runRCode } from './r-engine'

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
    normalised = true,
  } = params

  const trMax = Math.max(...timeRange)
  const trMin = Math.min(...timeRange)

  const result = await runRCode(`
    suppressPackageStartupMessages(library(rcarbon))

    # rcarbon::calibrate() — igual que app.R Panel 3
    .cal <- calibrate(
      ${toRVec(bps)}, ${toRVec(sds)},
      calCurves  = "${calCurve}",
      normalised = ${normalised ? 'TRUE' : 'FALSE'}
    )

    # rcarbon::spd() — suma las distribuciones calibradas en el rango temporal
    .spd      <- spd(.cal, timeRange = c(${trMax}, ${trMin}))
    .bcad     <- as.numeric(1950 - .spd$grid$calBP)
    .prob     <- as.numeric(.spd$grid$PrDens)

    # Media móvil — igual que plot.CalSPD de rcarbon: circular=TRUE evita NAs en extremos
    .smoothed <- as.numeric(stats::filter(.prob, rep(1 / ${runm}, ${runm}), circular = TRUE))

    list(
      bcad     = .bcad,
      prob     = .prob,
      smoothed = .smoothed,
      nDates   = length(.cal$grids)
    )
  `)

  return {
    bcad:     result.bcad,
    prob:     result.prob,
    smoothed: result.smoothed,
    nDates:   result.nDates,
  }
}

// ── computeStackSPD ───────────────────────────────────────────────────────────
// Equivale al bloque del Panel 4 de app.R:
//   Calib_matrix_isla <- calibrate(datos_spd_isla()$BP, datos_spd_isla()$SD)
//   sumprob_isla <- stackspd(x=Calib_matrix_isla, group=datos_spd_isla()$Vida, ...)
//
// Todos los grupos se calculan en un único proceso R y se devuelven como lista
// anidada — jsonlite los serializa directamente al formato StackSPDResult.
export async function computeStackSPD(params: StackSPDParams): Promise<StackSPDResult> {
  const {
    bps,
    sds,
    groups,
    timeRange = [2500, 250],
    calCurve  = 'intcal20',
  } = params

  const trMax = Math.max(...timeRange)
  const trMin = Math.min(...timeRange)

  const result = await runRCode(`
    suppressPackageStartupMessages(library(rcarbon))

    .cal    <- calibrate(
      ${toRVec(bps)}, ${toRVec(sds)},
      calCurves  = "${calCurve}",
      normalised = TRUE
    )
    .groups <- ${toRStrVec(groups)}

    # Calcular spd() por grupo subseteando CalDates con [.mask]
    # — mismo resultado que stackspd(), independiente de la versión de rcarbon
    .uniqueGroups <- sort(unique(.groups))
    .out <- setNames(vector("list", length(.uniqueGroups)), .uniqueGroups)

    for (.g in .uniqueGroups) {
      .mask   <- .groups == .g
      .calGrp <- .cal[.mask]
      .spdGrp <- spd(.calGrp, timeRange = c(${trMax}, ${trMin}))
      .out[[.g]] <- list(
        bcad = as.numeric(1950 - .spdGrp$grid$calBP),
        prob = as.numeric(.spdGrp$grid$PrDens)
      )
    }

    .out
  `)

  return result as StackSPDResult
}
