import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'

const YACIMIENTOS_MOCK = ['Acusa', 'Agüimes', 'Arguineguín', 'Gáldar', 'Telde']

export default function Panel3SPDSite() {
  const [yacimiento, setYacimiento] = useState(YACIMIENTOS_MOCK[0])
  const [trStart,    setTrStart]    = useState(2500)
  const [trEnd,      setTrEnd]      = useState(250)
  const [runm,       setRunm]       = useState(50)

  return (
    <AppShell title="SPD por yacimiento">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Yacimiento</label>
          <select
            value={yacimiento}
            onChange={e => setYacimiento(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
          >
            {YACIMIENTOS_MOCK.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

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
          <label className="text-xs font-medium text-gray-500">Suavizado (años)</label>
          <input
            type="number"
            value={runm}
            onChange={e => setRunm(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        <button
          onClick={() => console.log('Calcular SPD', { yacimiento, trStart, trEnd, runm })}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          Calcular
        </button>

      </div>

      {/* Resultados mock */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 h-96 flex items-center justify-center text-gray-400">
          El gráfico SPD aparecerá aquí
        </div>
      </div>

    </AppShell>
  )
}