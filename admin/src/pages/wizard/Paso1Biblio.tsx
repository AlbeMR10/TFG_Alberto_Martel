import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Bibliografia, BiblioInput } from '../../types'

interface Props {
  inputInicial: BiblioInput | null
  onSiguiente: (input: BiblioInput) => void
}

export default function Paso1Biblio({ inputInicial, onSiguiente }: Props) {
  const [bibliografias, setBibliografias] = useState<Bibliografia[]>([])
  const modoInicial = inputInicial?.tipo === 'nueva' ? 'nueva' : 'seleccionar'
  const [modo, setModo]         = useState<'seleccionar' | 'nueva'>(modoInicial)
  const [seleccionada, setSeleccionada] = useState<number | ''>(
    inputInicial?.tipo === 'existente' ? inputInicial.id : ''
  )
  const [bibtex, setBibtex]     = useState(inputInicial?.tipo === 'nueva' ? inputInicial.id_bibtex : '')
  const [referencia, setReferencia] = useState(inputInicial?.tipo === 'nueva' ? inputInicial.referencia : '')
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    api.getBibliografias().then(setBibliografias)
  }, [])

  const handleSiguiente = () => {
    setError(null)
    if (modo === 'seleccionar') {
      if (!seleccionada) { setError('Selecciona una bibliografía o crea una nueva'); return }
      onSiguiente({ tipo: 'existente', id: Number(seleccionada) })
    } else {
      if (!bibtex.trim()) { setError('El Id BibTeX es obligatorio'); return }
      onSiguiente({ tipo: 'nueva', id_bibtex: bibtex.trim(), referencia })
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Paso 1 — Bibliografía</h2>

      <div className="flex gap-4">
        <button
          onClick={() => setModo('seleccionar')}
          className={`px-4 py-2 rounded text-sm border ${modo === 'seleccionar' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          Seleccionar existente
        </button>
        <button
          onClick={() => setModo('nueva')}
          className={`px-4 py-2 rounded text-sm border ${modo === 'nueva' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          + Crear nueva
        </button>
      </div>

      {modo === 'seleccionar' ? (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Bibliografía</label>
          <select
            value={seleccionada}
            onChange={e => setSeleccionada(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">— Selecciona —</option>
            {bibliografias.map(b => (
              <option key={b.id} value={b.id}>
                {b.id_bibtex} — {b.referencia ?? 'Sin descripción'}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Id BibTeX <span className="text-red-500">*</span></label>
            <input
              value={bibtex}
              onChange={e => setBibtex(e.target.value)}
              placeholder="ej. Morales2014"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Referencia completa</label>
            <input
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              placeholder="ej. Morales et al. 2014"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSiguiente}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2 rounded"
      >
        Siguiente →
      </button>
    </div>
  )
}
