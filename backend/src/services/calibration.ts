import { runRCode } from './r-engine'

export interface CalibrationParams {
  bp:          number
  sd:          number
  calCurve?:   string
  resOffset?:  number
  resError?:   number
  normalised?: boolean
}

export interface CalibrationResult {
  bp:         number
  sd:         number
  bcad:       number[]
  prob:       number[]
  inHpd1:    number[]
  inHpd2:    number[]
  median:     number
  curveBcad:  number[]
  curveC14:   number[]
  curveError: number[]
}

// calibrate() — equivalente a rcarbon::calibrate() del Panel 2 de app.R
export async function calibrate(params: CalibrationParams): Promise<CalibrationResult> {
  const {
    bp,
    sd,
    calCurve   = 'intcal20',
    resOffset  = 0,
    resError   = 0,
    normalised = false,
  } = params

  const result = await runRCode(`
    suppressPackageStartupMessages(library(rcarbon))

    # rcarbon::calibrate() — igual que app.R
    .cal <- calibrate(
      ${bp}, ${sd},
      calCurves  = "${calCurve}",
      resOffsets = ${resOffset},
      resErrors  = ${resError},
      normalised = ${normalised ? 'TRUE' : 'FALSE'}
    )

    # ── Distribución calibrada ─────────────────────────────────────────────────
    .grid <- .cal$grids[[1]]
    .bcad <- as.numeric(1950 - .grid$calBP)
    .prob <- as.numeric(.grid$PrDens)
    if (sum(.prob) > 0) .prob <- .prob / sum(.prob)

    # Mediana
    .cum <- cumsum(.prob)
    .med <- as.numeric(.bcad[which(.cum >= 0.5)[1]])

    # Máscaras HPD
    .idx  <- order(.prob, decreasing = TRUE)
    .cumS <- cumsum(.prob[.idx]) / sum(.prob)
    .hpd2 <- as.integer(replace(logical(length(.prob)), .idx[.cumS <= 0.954], TRUE))
    .hpd1 <- as.integer(replace(logical(length(.prob)), .idx[.cumS <= 0.683], TRUE))

    # ── Curva de calibración ───────────────────────────────────────────────────
    # rcarbon almacena sus curvas en extdata/ como ficheros .14c.
    # Usamos system.file() para apuntar a esa copia interna — la misma que
    # calibrate() usa — en lugar de los ficheros del proyecto.
    .curvePath <- system.file("extdata", paste0("${calCurve}", ".14c"), package = "rcarbon")
    .curveData <- read.table(.curvePath, skip = 11, header = FALSE, sep = ",")

    # Solo el rango visible (prob > 0.1% del máximo, +40% de margen)
    .sigMask  <- .prob > max(.prob) * 0.001
    .bpMin    <- min(.grid$calBP[.sigMask])
    .bpMax    <- max(.grid$calBP[.sigMask])
    .margin   <- (.bpMax - .bpMin) * 0.40
    .cMask    <- .curveData[,1] >= (.bpMin - .margin) & .curveData[,1] <= (.bpMax + .margin)
    .curveSub <- .curveData[.cMask, ]

    .curveBcad  <- as.numeric(1950 - .curveSub[,1])
    .curveC14   <- as.numeric(.curveSub[,2])
    .curveError <- as.numeric(.curveSub[,3])

    # Devolver todo como lista — r-engine lo serializa a JSON automáticamente
    list(
      bcad       = .bcad,
      prob       = .prob,
      inHpd1    = .hpd1,
      inHpd2    = .hpd2,
      median     = .med,
      curveBcad  = .curveBcad,
      curveC14   = .curveC14,
      curveError = .curveError
    )
  `)

  return {
    bp, sd,
    bcad:       result.bcad,
    prob:       result.prob,
    inHpd1:    result.inHpd1,
    inHpd2:    result.inHpd2,
    median:     result.median,
    curveBcad:  result.curveBcad,
    curveC14:   result.curveC14,
    curveError: result.curveError,
  }
}
