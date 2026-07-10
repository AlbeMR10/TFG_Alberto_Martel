import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Yacimiento, YacInput } from '../../types'

interface Props {
  inputInicial: YacInput | null
  onAnterior: () => void
  onSiguiente: (input: YacInput) => void
}

export default function PasoYacimiento({ inputInicial, onAnterior, onSiguiente }: Props) {
  const [yacimientos, setYacimientos] = useState<Yacimiento[]>([])
  const modoInicial = inputInicial?.tipo === 'nuevo' ? 'nuevo' : 'seleccionar'
  const [modo, setModo]               = useState<'seleccionar' | 'nuevo'>(modoInicial)
  const [seleccionado, setSeleccionado] = useState<number | ''>(
    inputInicial?.tipo === 'existente' ? inputInicial.id : ''
  )
  const [form, setForm] = useState({
    nombre:            inputInicial?.tipo === 'nuevo' ? inputInicial.nombre            : '',
    localidad:         inputInicial?.tipo === 'nuevo' ? inputInicial.localidad         : '',
    isla:              inputInicial?.tipo === 'nuevo' ? inputInicial.isla              : '',
    provincia:         inputInicial?.tipo === 'nuevo' ? inputInicial.provincia         : '',
    unidad_geografica: inputInicial?.tipo === 'nuevo' ? inputInicial.unidad_geografica : '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getYacimientos().then(setYacimientos)
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSiguiente = () => {
    setError(null)
    if (modo === 'seleccionar') {
      if (!seleccionado) { setError('Selecciona un yacimiento o crea uno nuevo'); return }
      onSiguiente({ tipo: 'existente', id: Number(seleccionado) })
    } else {
      if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
      onSiguiente({ tipo: 'nuevo', ...form })
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Paso 2 — Yacimiento</h2>

      <div className="flex gap-4">
        <button
          onClick={() => setModo('seleccionar')}
          className={`px-4 py-2 rounded text-sm border ${modo === 'seleccionar' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          Seleccionar existente
        </button>
        <button
          onClick={() => setModo('nuevo')}
          className={`px-4 py-2 rounded text-sm border ${modo === 'nuevo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          + Crear nuevo
        </button>
      </div>

      {modo === 'seleccionar' ? (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Yacimiento</label>
          <select
            value={seleccionado}
            onChange={e => setSeleccionado(Number(e.target.value))}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">— Selecciona —</option>
            {yacimientos.map(y => (
              <option key={y.id} value={y.id}>
                {y.nombre} — {y.isla ?? ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {([
            ['nombre',            'Nombre',             true],
            ['localidad',         'Localidad',          false],
            ['isla',              'Isla',               false],
            ['provincia',         'Provincia',          false],
            ['unidad_geografica', 'Unidad Geográfica',  false],
          ] as [keyof typeof form, string, boolean][]).map(([k, label, req]) => (
            <div key={k} className={k === 'nombre' ? 'col-span-2' : ''}>
              <label className="block text-sm text-gray-600 mb-1">
                {label} {req && <span className="text-red-500">*</span>}
              </label>
              <input
                value={form[k]}
                onChange={set(k)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onAnterior}
          className="border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <button
          onClick={handleSiguiente}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2 rounded"
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
