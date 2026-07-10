import type { Muestra, Yacimiento, Bibliografia } from './types'

const BASE = 'http://localhost:3001/api/admin'

async function checked(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Error del servidor')
  return data
}

export const api = {
  // ── Consultas ────────────────────────────────────────────────────────────
  getMuestras: (): Promise<Muestra[]> =>
    fetch(`${BASE}/muestras`).then(r => r.json()),

  getYacimientos: (): Promise<Yacimiento[]> =>
    fetch(`${BASE}/yacimientos`).then(r => r.json()),

  getBibliografias: (): Promise<Bibliografia[]> =>
    fetch(`${BASE}/bibliografias`).then(r => r.json()),

  // ── Crear ────────────────────────────────────────────────────────────────
  guardarCompleto: (data: object): Promise<{ id: number }> =>
    fetch(`${BASE}/muestras/completa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(checked),

  editarCompleto: (id: number, data: object): Promise<void> =>
    fetch(`${BASE}/muestras/${id}/completa`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(checked),

  // ── Eliminar ─────────────────────────────────────────────────────────────
  eliminarMuestra: (id: number): Promise<{ ok: boolean; deleted: string[] }> =>
    fetch(`${BASE}/muestras/${id}`, { method: 'DELETE' }).then(checked),
}
