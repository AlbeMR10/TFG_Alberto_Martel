import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import SPDChart from '../../components/charts/SPDChart'
import { useYacimientos, useMuestras } from '../../hooks/useMuestras'
import { useSPDSite } from '../../hooks/useSPD'
import type { Muestra } from '../../types/api'

const COLS: (keyof Muestra)[] = [
  'IdMuestra', 'Isla', 'BP', 'SD', 'Vida', 'Material', 'Especie', 'Adscripcion', 'Id_BibTeX',
]

export default function Panel3SPDSite() {
  const [yacimiento,  setYacimiento]  = useState('')
  const [trStartStr,  setTrStartStr]  = useState('2500')
  const [trEndStr,    setTrEndStr]    = useState('250')
  const [runmStr,     setRunmStr]     = useState('50')
  const [calcular,    setCalcular]    = useState(false)

  const trStart = parseInt(trStartStr) || 2500
  const trEnd   = parseInt(trEndStr)   || 250
  const runm    = parseInt(runmStr)    || 50

  const { data: yacimientos, isLoading: loadingYac } = useYacimientos()
  const { data: muestras }                            = useMuestras()

  const sorted    = [...(yacimientos ?? [])].sort((a, b) => a.localeCompare(b))
  const yacActual = yacimiento || sorted[0] || ''

  const { data, isLoading, error } = useSPDSite(
    yacActual,
    { timeRangeStart: trStart, timeRangeEnd: trEnd, runm },
    calcular && !!yacActual,
  )

  const filasSite: Muestra[] = (muestras ?? [])
    .filter(m => m.Yacimiento === yacActual && m.Higiene >= 1 && m.Higiene <= 7)

  return (
    <AppShell title="SPD por yacimiento">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">

        <Select
          label="Yacimiento"
          value={yacActual}
          onChange={v => { setYacimiento(v); setCalcular(false) }}
          options={loadingYac
            ? [{ value: '', label: 'Cargando...' }]
            : sorted.map(y => ({ value: y, label: y }))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Inicio cal BP</label>
          <input type="number" value={trStartStr}
            onChange={e => { setTrStartStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Fin cal BP</label>
          <input type="number" value={trEndStr}
            onChange={e => { setTrEndStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Suavizado (años)</label>
          <input type="number" value={runmStr}
            onChange={e => { setRunmStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <button
          onClick={() => setCalcular(true)}
          disabled={!yacActual || isLoading}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </button>

      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Gráfica */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 h-96">
          {!calcular && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Selecciona un yacimiento y pulsa Calcular
            </div>
          )}
          {calcular && isLoading && <Spinner />}
          {calcular && error     && <ErrorMessage message={error.message} />}
          {calcular && data && (
            <SPDChart data={data} yacimiento={yacActual} runm={runm} />
          )}
        </div>

        {/* Tabla de fechas del yacimiento */}
        {calcular && data && filasSite.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Información principal fechas yacimiento
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({filasSite.length} fecha{filasSite.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-brand-dark text-white">
                    {COLS.map(c => (
                      <th key={c} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasSite.map((m, i) => (
                    <tr key={m.IdMuestra} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {COLS.map(c => (
                        <td key={c} className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap">
                          {m[c] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
