import { runR, getRVector } from './webr'

// Parametros que recibe el servicio desde el frontend.
// Nota: el servicio NO recibe IdMuestra — eso lo resuelve la RUTA.
// La ruta consulta MySQL con IdMuestra, obtiene BP y SD, y los pasa aqui.
// Asi el servicio solo hace matematicas y no depende de la base de datos.
//
// En app.R el equivalente es:
//   datos <- reactive({ subset(filemaker, IdMuestra == input$Datacion, c("BP","SD")) })
//   acalibrar <- calibrate(datos()$BP, datos()$SD, ...)
// Esa resolucion IdMuestra -> BP/SD la hace la ruta con MySQL, no este servicio.
export interface CalibrationParams {
  bp:          number
  sd:          number
  calCurve?:   string   // 'intcal20' | 'intcal13' | 'marine20' | 'marine13'
  resOffset?:  number   // DeltaR          — input$resOffsets en app.R
  resError?:   number   // error DeltaR    — input$resErrors  en app.R
  normalised?: boolean  // normalizar prob — input$norm_calibracion en app.R
}

// Lo que devuelve el servicio al frontend (via JSON)
export interface CalibrationResult {
  // Distribucion calibrada
  bcad:       number[]  // años cal BC/AD  (eje X del grafico)
  prob:       number[]  // densidad de probabilidad en cada año (eje Y izquierdo)
  inHpd1:    number[]  // mascara 1sigma: 1 = dentro del HPD 68.3%, 0 = fuera
  inHpd2:    number[]  // mascara 2sigma: 1 = dentro del HPD 95.4%, 0 = fuera
  median:     number    // mediana en BC/AD

  // Curva de calibracion — para el eje Y derecho (banda naranja)
  // rcarbon ya la tiene en memoria, la extraemos sin leer ningun archivo
  curveBcad:  number[]  // años BC/AD de la curva (mismo eje X)
  curveC14:   number[]  // edad 14C BP de la curva (eje Y derecho)
  curveError: number[]  // incertidumbre ±1sigma de la curva (para la banda)
}

// calibrate() — equivalente a rcarbon::calibrate() + rcarbon::summary()
// Corresponde a output$calibrada y output$summary_cal del Panel 2 de app.R
export async function calibrate(params: CalibrationParams): Promise<CalibrationResult> {
  const {
    bp,
    sd,
    calCurve   = 'intcal20',
    resOffset  = 0,
    resError   = 0,
    normalised = false,
  } = params

  await runR(`
    suppressPackageStartupMessages(library(rcarbon))

    # rcarbon::calibrate() — igual que app.R
    .cal <- calibrate(
      ${bp}, ${sd},
      calCurves  = "${calCurve}",
      resOffsets = ${resOffset},
      resErrors  = ${resError},
      normalised = ${normalised ? 'TRUE' : 'FALSE'}
    )

    # ── Distribucion calibrada ──────────────────────────────────────────────
    .grid <- .cal$grids[[1]]
    .bcad <- as.numeric(1950 - .grid$calBP)
    .prob <- as.numeric(.grid$PrDens)
    if (sum(.prob) > 0) .prob <- .prob / sum(.prob)

    # Mediana via rcarbon::summary()
    .summ <- summary(.cal, calendar = "BCAD")
    .med  <- as.numeric(.summ$MedianBCAD[1])

    # Mascaras HPD
    .idx  <- order(.prob, decreasing = TRUE)
    .cum  <- cumsum(.prob[.idx]) / sum(.prob)
    .hpd2 <- as.integer(replace(logical(length(.prob)), .idx[.cum <= 0.954], TRUE))
    .hpd1 <- as.integer(replace(logical(length(.prob)), .idx[.cum <= 0.683], TRUE))

    # ── Curva de calibracion ────────────────────────────────────────────────
    # rcarbon ya cargo la curva en memoria para hacer el calibrate().
    # La extraemos directamente del paquete sin leer ningun archivo .14c.
    .curveFile <- system.file("data", paste0("${calCurve}", ".rda"), package = "rcarbon")
    .env <- new.env()
    load(.curveFile, envir = .env)
    .curveRaw <- get(ls(.env)[1], envir = .env)

    # Filtrar solo el rango visible (donde hay probabilidad significativa + 40% margen)
    # Asi no enviamos 55000 años de curva al frontend, solo los relevantes
    .sigMask  <- .prob > max(.prob) * 0.001
    .bpMin    <- min(.grid$calBP[.sigMask])
    .bpMax    <- max(.grid$calBP[.sigMask])
    .margin   <- (.bpMax - .bpMin) * 0.40
    .cMask    <- .curveRaw[,1] >= (.bpMin - .margin) & .curveRaw[,1] <= (.bpMax + .margin)
    .curveSub <- .curveRaw[.cMask, ]

    # Columnas: 1 = calBP, 2 = C14BP, 3 = Error (formato estandar IntCal)
    .curveBcad  <- as.numeric(1950 - .curveSub[,1])
    .curveC14   <- as.numeric(.curveSub[,2])
    .curveError <- as.numeric(.curveSub[,3])

    invisible(NULL)
  `)

  const [bcad, prob, inHpd1, inHpd2, medArr,
         curveBcad, curveC14, curveError] = await Promise.all([
    getRVector('.bcad'),
    getRVector('.prob'),
    getRVector('.hpd1'),
    getRVector('.hpd2'),
    getRVector('.med'),
    getRVector('.curveBcad'),
    getRVector('.curveC14'),
    getRVector('.curveError'),
  ])

  return {
    bcad, prob, inHpd1, inHpd2, median: medArr[0],
    curveBcad, curveC14, curveError,
  }
}
