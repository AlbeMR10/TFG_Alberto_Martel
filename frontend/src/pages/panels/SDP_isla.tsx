import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import StackSPDChart from '../../components/charts/StackSPDChart'
import { useIslas } from '../../hooks/useMuestras'
import { useSPDIsland } from '../../hooks/useSPD'

const GRUPOS = ['Vida', 'Adscripcion', 'Contexto_Est', 'Material']

export default function Panel4SPDIsland() {
  const [isla,     setIsla]     = useState('')
  const [grupo,    setGrupo]    = useState('Vida')
  const [trStart,  setTrStart]  = useState(2500)
  const [trEnd,    setTrEnd]    = useState(250)
  const [calcular, setCalcular] = useState(false)

  const { data: islas, isLoading: loadingIslas } = useIslas()

  const sorted     = [...(islas ?? [])].sort((a, b) => a.localeCompare(b))
  const islaActual = isla || sorted[0] || ''

  const { data, isLoading, error } = useSPDIsland(
    islaActual,
    { group: grupo, timeRangeStart: trStart, timeRangeEnd: trEnd },
    calcular && !!islaActual,
  )

  return (
    <AppShell title="SPD por unidad geográfica">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">

        <Select
          label="Isla"
          value={islaActual}
          onChange={v => { setIsla(v); setCalcular(false) }}
          options={loadingIslas
            ? [{ value: '', label: 'Cargando...' }]
            : sorted.map(i => ({ value: i, label: i }))}
        />

        <Select
          label="Exploración SPD basado en"
          value={grupo}
          onChange={v => { setGrupo(v); setCalcular(false) }}
          options={GRUPOS.map(g => ({ value: g, label: g }))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Inicio cal BP</label>
          <input type="number" value={trStart}
            onChange={e => { setTrStart(Number(e.target.value)); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Fin cal BP</label>
          <input type="number" value={trEnd}
            onChange={e => { setTrEnd(Number(e.target.value)); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <button
          onClick={() => setCalcular(true)}
          disabled={!islaActual || isLoading}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </button>

      </div>

      <div className="p-6">

        {!calcular && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 h-48 flex items-center justify-center text-gray-400 text-sm">
            Selecciona una isla y pulsa Calcular
          </div>
        )}

        {calcular && isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 h-48 flex items-center justify-center">
            <Spinner />
          </div>
        )}

        {calcular && error && <ErrorMessage message={error.message} />}

        {calcular && data && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 overflow-y-auto">
            <StackSPDChart data={data} isla={islaActual} groupBy={grupo} />
          </div>
        )}

      </div>
    </AppShell>
  )
}
