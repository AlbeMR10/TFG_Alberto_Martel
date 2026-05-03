import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'

const ISLAS_MOCK = ['El Hierro', 'Fuerteventura', 'Gran Canaria', 'La Gomera', 'La Palma', 'Lanzarote', 'Tenerife']
const MODELOS    = ['exponential', 'uniform', 'linear']

export default function Panel5Paleodemography() {
  const [isla,    setIsla]    = useState(ISLAS_MOCK[0])
  const [modelo,  setModelo]  = useState('exponential')
  const [trStart, setTrStart] = useState(2500)
  const [trEnd,   setTrEnd]   = useState(250)
  const [nsim,    setNsim]    = useState(100)
  const [runm,    setRunm]    = useState(50)
  const [binH,    setBinH]    = useState(50)
  const [growthRate, setGrowthRate] = useState('roc')

  return (
    <AppShell title="Paleodemografía">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">

        <Select
          label="Isla"
          value={isla}
          onChange={setIsla}
          options={ISLAS_MOCK.map(i => ({ value: i, label: i }))}
        />
        
        <Select
          label="Modelo demográfico"
          value={modelo}
          onChange={setModelo}
          options={MODELOS.map(m => ({ value: m, label: m }))}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Inicio cal BP</label>
          <input
            type="number"
            value={trStart}
            onChange={e => setTrStart(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Fin cal BP</label>
          <input
            type="number"
            value={trEnd}
            onChange={e => setTrEnd(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Simulaciones MC</label>
          <input
            type="number"
            value={nsim}
            min={1}
            max={100}
            onChange={e => setNsim(Math.min(100, Number(e.target.value)))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Suavizado (años)</label>
          <input
            type="number"
            value={runm}
            onChange={e => setRunm(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Agrupar en años</label>
          <input
            type="number"
            value={binH}
            onChange={e => setBinH(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <Select
          label="Ratio de crecimiento"
          value={growthRate}
          onChange={setGrowthRate}
          options={[
            { value: 'roc', label: 'ROC' },
            { value: 'spd', label: 'SPD' }
          ]}
        />

        <button
          onClick={() => console.log('Calcular Paleo', { isla, modelo, trStart, trEnd, nsim, runm, binH, growthRate })}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          Calcular
        </button>

      </div>

      {/* Resultados mock — dos gráficas como en app.R */}
      <div className="p-6 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 h-72 flex items-center justify-center text-gray-400">
          SPD observado vs modelo teórico aparecerá aquí
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 h-72 flex items-center justify-center text-gray-400">
          Rate of Change aparecerá aquí
        </div>
      </div>

    </AppShell>
  )
}
