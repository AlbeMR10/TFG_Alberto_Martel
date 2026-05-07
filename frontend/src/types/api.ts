// ── Panel 2 — Calibración individual ─────────────────────────────────────────
export interface CalibrationResult {
  bcad:       number[]   // eje X en cal BC/AD
  prob:       number[]   // probabilidad calibrada
  inHpd1:     boolean[]  // máscara intervalo 1σ
  inHpd2:     boolean[]  // máscara intervalo 2σ
  median:     number     // mediana en cal BC/AD
  curveBcad:  number[]   // curva de calibración eje X
  curveC14:   number[]   // curva de calibración eje Y (C14 BP)
  curveError: number[]   // error de la curva
}

// ── Panel 3 — SPD por yacimiento ──────────────────────────────────────────────
export interface SPDResult {
  bcad:     number[]  // eje X
  prob:     number[]  // SPD bruto (curva roja)
  smoothed: number[]  // media móvil (línea azul)
  nDates:   number    // número de fechas usadas
}

// ── Panel 4 — SPD apilado por isla ────────────────────────────────────────────
export interface StackSPDGroup {
  bcad: number[]
  prob: number[]
}
export type StackSPDResult = Record<string, StackSPDGroup>

// ── Panel 5 — Paleodemografía ─────────────────────────────────────────────────
export interface PaleodemographyResult {
  bcad:        number[]
  spdObs:      number[]   // SPD observado
  envelopeHi:  number[]   // percentil 97.5 simulaciones
  envelopeLo:  number[]   // percentil 2.5 simulaciones
  fitModel:    number[]   // modelo teórico ajustado
  positiveDev: boolean[]  // exceso significativo
  negativeDev: boolean[]  // déficit significativo
  rocObs:      number[]   // Rate of Change observado
  rocHi:       number[]
  rocLo:       number[]
  rocPosDev:   boolean[]
  rocNegDev:   boolean[]
  nDates:      number
  nBins:       number
  pVal:        number
}

// ── Muestras ──────────────────────────────────────────────────────────────────
export interface Muestra {
  IdMuestra:   string
  BP:          number
  SD:          number
  Yacimiento:  string
  Isla:        string
  Material:    string
  Vida:        string
  Adscripcion: string
  Contexto_Est:string
  Higiene:     number
  Especie:     string
  Referencia:  string
  Id_BibTeX:   string
  Lat:         number
  Lon:         number
}

// ── Parámetros comunes ────────────────────────────────────────────────────────
export type CalCurve = 'intcal20' | 'intcal13' | 'marine20' | 'marine13'
export type GroupCol = 'Vida' | 'Adscripcion' | 'Contexto_Est' | 'Material'
export type DemoModel = 'exponential' | 'uniform' | 'linear'