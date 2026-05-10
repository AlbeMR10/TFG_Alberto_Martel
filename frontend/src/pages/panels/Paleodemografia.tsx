import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import { useIslas } from '../../hooks/useMuestras'
import { usePaleodemography } from '../../hooks/usePaleodemography'

const MODELOS = ['exponential', 'uniform', 'linear']

export default function Panel5Paleodemography() {
  const [isla,       setIsla]       = useState('')
  const [modelo,     setModelo]     = useState('exponential')
  const [trStartStr, setTrStartStr] = useState('2500')
  const [trEndStr,   setTrEndStr]   = useState('250')
  const [nsimStr,    setNsimStr]    = useState('2')
  const [runmStr,    setRunmStr]    = useState('50')
  const [binHStr,    setBinHStr]    = useState('50')
  const [growthRate, setGrowthRate] = useState<'roc' | 'spd'>('roc')
  const [calcular,   setCalcular]   = useState(false)

  // Valores numéricos derivados del string (fallback al default si vacío/inválido)
  const trStart = parseInt(trStartStr) || 2500
  const trEnd   = parseInt(trEndStr)   || 250
  const nsim    = Math.min(100, Math.max(1, parseInt(nsimStr)  || 2))
  const runm    = parseInt(runmStr)    || 50
  const binH    = parseInt(binHStr)    || 50

  const { data: islas, isLoading: loadingIslas } = useIslas()

  const sorted     = [...(islas ?? [])].sort((a, b) => a.localeCompare(b))
  const islaActual = isla || sorted[0] || ''

  const { data, isLoading, error } = usePaleodemography(
    islaActual,
    { timeRangeStart: trStart, timeRangeEnd: trEnd, nsim, runm, binH, model: modelo },
    calcular && !!islaActual,
  )

  return (
    <AppShell title="Paleodemografía">

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
          label="Modelo demográfico"
          value={modelo}
          onChange={v => { setModelo(v); setCalcular(false) }}
          options={MODELOS.map(m => ({ value: m, label: m }))}
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
          <label className="text-xs font-medium text-gray-500">Simulaciones MC</label>
          <input type="number" value={nsimStr} min={1} max={100}
            onChange={e => { setNsimStr(e.target.value); setCalcular(false) }}
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

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Agrupar en años</label>
          <input type="number" value={binHStr}
            onChange={e => { setBinHStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <Select
          label="Analizar ratio crecimiento"
          value={growthRate}
          onChange={v => setGrowthRate(v as 'roc' | 'spd')}
          options={[
            { value: 'roc', label: 'ROC' },
            { value: 'spd', label: 'SPD' },
          ]}
        />

        <button
          onClick={() => setCalcular(true)}
          disabled={!islaActual || isLoading}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </button>

      </div>

      <div className="p-6 flex flex-col gap-6">

        {!calcular && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 h-48 flex items-center justify-center text-gray-400 text-sm">
            Selecciona una isla y pulsa Calcular
          </div>
        )}

        {calcular && isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center justify-center gap-4">
            <Spinner />
            <p className="text-sm text-gray-500">
              Ejecutando simulacion, el cálculo puede tardar varios minutos…
            </p>
          </div>
        )}

        {calcular && error && <ErrorMessage message={error.message} />}

        {calcular && data && (
          <>
            {/* Gráfica 1: SPD observado vs modelo teórico */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-center">
              <img
                src={`data:image/png;base64,${data.spdPlot}`}
                alt="SPD observado vs modelo teórico"
                className="max-w-3xl w-full"
              />
            </div>

            {/* Gráfica 2: ROC o SPD growth según selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 flex justify-center">
              <img
                src={`data:image/png;base64,${growthRate === 'roc' ? data.rocPlot : data.spdGrowthPlot}`}
                alt="Testeo ratios de crecimiento"
                className="max-w-3xl w-full"
              />
            </div>
          </>
        )}

      </div>
    </AppShell>
  )
}
