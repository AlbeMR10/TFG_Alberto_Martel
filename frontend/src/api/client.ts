import type {
  CalibrationResult,
  SPDResult,
  StackSPDResult,
  PaleodemographyResult,
  Muestra,
} from '../types/api'

const BASE = '/api'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {

  // ── Muestras ──────────────────────────────────────────────────────────────
  getMuestras: () =>
    get<Muestra[]>(`${BASE}/muestras`),

  getYacimientos: () =>
    get<string[]>(`${BASE}/spd/yacimientos`),

  getIslas: () =>
    get<string[]>(`${BASE}/spd/islas`),

  // ── Panel 2 — Calibración ─────────────────────────────────────────────────
  getCalibration: (
    idMuestra: string,
    params: { calCurve?: string; resOffset?: number; resError?: number; normalised?: boolean }
  ) => {
    const qs = new URLSearchParams({
      calCurve:   params.calCurve  ?? 'intcal20',
      resOffset:  String(params.resOffset  ?? 0),
      resError:   String(params.resError   ?? 0),
      normalised: String(params.normalised ?? false),
    })
    return get<CalibrationResult>(`${BASE}/calibrate/${encodeURIComponent(idMuestra)}?${qs}`)
  },

  // ── Panel 3 — SPD por yacimiento ──────────────────────────────────────────
  getSPDSite: (
    yacimiento: string,
    params: { timeRangeStart?: number; timeRangeEnd?: number; runm?: number }
  ) => {
    const qs = new URLSearchParams({
      timeRangeStart: String(params.timeRangeStart ?? 2500),
      timeRangeEnd:   String(params.timeRangeEnd   ?? 250),
      runm:           String(params.runm           ?? 50),
    })
    return get<SPDResult>(`${BASE}/spd/site/${encodeURIComponent(yacimiento)}?${qs}`)
  },

  // ── Panel 4 — SPD por isla ────────────────────────────────────────────────
  getSPDIsland: (
    isla: string,
    params: { group?: string; timeRangeStart?: number; timeRangeEnd?: number }
  ) => {
    const qs = new URLSearchParams({
      group:          params.group          ?? 'Vida',
      timeRangeStart: String(params.timeRangeStart ?? 2500),
      timeRangeEnd:   String(params.timeRangeEnd   ?? 250),
    })
    return get<StackSPDResult>(`${BASE}/spd/isla/${encodeURIComponent(isla)}?${qs}`)
  },

  // ── Panel 5 — Paleodemografía ─────────────────────────────────────────────
  getPaleodemography: (
    isla: string,
    params: {
      timeRangeStart?: number; timeRangeEnd?: number
      nsim?: number; runm?: number; binH?: number
      model?: string
    }
  ) => {
    const qs = new URLSearchParams({
      timeRangeStart: String(params.timeRangeStart ?? 2500),
      timeRangeEnd:   String(params.timeRangeEnd   ?? 250),
      nsim:           String(params.nsim           ?? 100),
      runm:           String(params.runm           ?? 50),
      binH:           String(params.binH           ?? 50),
      model:          params.model                 ?? 'exponential',
    })
    return get<PaleodemographyResult>(`${BASE}/paleodemography/isla/${encodeURIComponent(isla)}?${qs}`)
  },
}
