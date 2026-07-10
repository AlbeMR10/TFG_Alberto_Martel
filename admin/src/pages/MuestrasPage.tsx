import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Muestra } from '../types'

const COLUMNAS: { key: keyof Muestra; label: string }[] = [
  { key: 'IdMuestra',        label: 'IdMuestra' },
  { key: 'BP',               label: 'BP' },
  { key: 'SD',               label: 'SD' },
  { key: 'Yacimiento',       label: 'Yacimiento' },
  { key: 'Isla',             label: 'Isla' },
  { key: 'Localidad',        label: 'Localidad' },
  { key: 'Provincia',        label: 'Provincia' },
  { key: 'UnidadGeografica', label: 'Unidad Geográfica' },
  { key: 'Lat',              label: 'Lat' },
  { key: 'Lon',              label: 'Lon' },
  { key: 'Vida',             label: 'Vida' },
  { key: 'Material',         label: 'Material' },
  { key: 'Tipo',             label: 'Tipo' },
  { key: 'Cantidad',         label: 'Cantidad' },
  { key: 'Especie',          label: 'Especie' },
  { key: 'Carbono_13',       label: 'Carbono 13' },
  { key: 'Nitrogeno_15',     label: 'Nitrógeno 15' },
  { key: 'Oxigeno_18',       label: 'Oxígeno 18' },
  { key: 'CN',               label: 'C:N' },
  { key: 'Colageno',         label: 'Colágeno' },
  { key: 'DietaMarina',      label: 'Dieta Marina' },
  { key: 'EfectoReservorio', label: 'Efecto Reservorio' },
  { key: 'CtxDomestico',     label: 'Ctx. Doméstico' },
  { key: 'CtxFunerario',     label: 'Ctx. Funerario' },
  { key: 'CtxOtro',          label: 'Ctx. Otro' },
  { key: 'CtxDescontext',    label: 'Ctx. Descontextualizado' },
  { key: 'TipoYacimiento',   label: 'Tipo Yacimiento' },
  { key: 'ContextoEst',      label: 'Contexto Est.' },
  { key: 'ContextoFun1',     label: 'Contexto Fun. 1' },
  { key: 'ContextoFun2',     label: 'Contexto Fun. 2' },
  { key: 'Nivel',            label: 'Nivel' },
  { key: 'UUEE',             label: 'UUEE' },
  { key: 'Adscripcion',      label: 'Adscripción' },
  { key: 'AutoriaFicha',     label: 'Autoría Ficha' },
  { key: 'FechaIntroduccion',label: 'Fecha Introducción' },
  { key: 'Higiene',          label: 'Higiene' },
  { key: 'Referencia',       label: 'Referencia' },
  { key: 'IdBibTeX',         label: 'Id BibTeX' },
]

interface Props {
  onAnadir: () => void
  onEditar: (m: Muestra) => void
  mensajeInicial?: string
  onMensajeVisto?: () => void
}

export default function MuestrasPage({ onAnadir, onEditar, mensajeInicial, onMensajeVisto }: Props) {
  const [muestras, setMuestras]   = useState<Muestra[]>([])
  const [busqueda, setBusqueda]   = useState('')
  const [cargando, setCargando]   = useState(true)
  const [seleccionada, setSeleccionada] = useState<Muestra | null>(null)
  const [mensaje, setMensaje]     = useState<string | null>(mensajeInicial ?? null)

  const cargar = () => {
    setCargando(true)
    api.getMuestras().then(data => { setMuestras(data); setCargando(false) })
  }

  useEffect(() => { cargar() }, [])

  const filtradas = muestras.filter(m =>
    m.IdMuestra.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.Yacimiento.toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.Isla ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const handleEliminar = async () => {
    if (!seleccionada) return
    if (!confirm(`¿Eliminar la muestra ${seleccionada.IdMuestra}? Esta acción no se puede deshacer.`)) return

    const res = await api.eliminarMuestra(seleccionada.id)
    setSeleccionada(null)
    setMensaje(`Eliminado: ${res.deleted.join(', ')}`)
    setTimeout(() => { setMensaje(null); onMensajeVisto?.() }, 4000)
    cargar()
  }

  const formatVal = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '—'
    if (typeof val === 'boolean') return val ? 'Sí' : 'No'
    return String(val)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Cabecera */}
      <div className="bg-brand-dark border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-white shrink-0">
            Panel de administración — 14Canarias
          </h1>
          <input
            type="text"
            placeholder="Buscar por IdMuestra, yacimiento o isla..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 max-w-md border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onAnadir}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded"
            >
              + Añadir
            </button>
            <button
              onClick={() => seleccionada && onEditar(seleccionada)}
              disabled={!seleccionada}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
            >
              Editar
            </button>
            <button
              onClick={handleEliminar}
              disabled={!seleccionada}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded"
            >
              Eliminar
            </button>
          </div>
        </div>
        {mensaje && (
          <p className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1">
            ✓ {mensaje}
          </p>
        )}
      </div>

      {/* Info selección */}
      {seleccionada && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2 text-sm text-blue-800">
          Seleccionada: <strong>{seleccionada.IdMuestra}</strong> — {seleccionada.Yacimiento}
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {cargando ? (
          <p className="p-8 text-gray-500 text-sm">Cargando...</p>
        ) : (
          <table className="text-xs border-collapse w-max min-w-full">
            <thead className="sticky top-0 z-10 bg-gray-100">
              <tr>
                {COLUMNAS.map(c => (
                  <th
                    key={c.key}
                    className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(m => (
                <tr
                  key={m.id}
                  onClick={() => setSeleccionada(prev => prev?.id === m.id ? null : m)}
                  className={`cursor-pointer border-b border-gray-200 hover:bg-blue-50 ${
                    seleccionada?.id === m.id ? 'bg-blue-100' : 'bg-white'
                  }`}
                >
                  {COLUMNAS.map(c => (
                    <td key={c.key} className="border border-gray-200 px-3 py-1.5 whitespace-nowrap">
                      {formatVal(m[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pie */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 text-xs text-gray-500">
        {filtradas.length} de {muestras.length} muestras
        {seleccionada ? ' · Haz clic en otra fila para deseleccionar' : ' · Haz clic en una fila para seleccionarla'}
      </div>
    </div>
  )
}
