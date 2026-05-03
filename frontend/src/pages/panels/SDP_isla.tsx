import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'

const ISLAS_MOCK  = ['El Hierro', 'Fuerteventura', 'Gran Canaria', 'La Gomera', 'La Palma', 'Lanzarote', 'Tenerife']
const GRUPOS      = ['Vida', 'Adscripcion', 'Contexto_Est', 'Material']

export default function Panel4SPDIsland() {
  const [isla,    setIsla]    = useState(ISLAS_MOCK[0])
  const [grupo,   setGrupo]   = useState('Vida')
  const [trStart, setTrStart] = useState(2500)
  const [trEnd,   setTrEnd]   = useState(250)

  return (
    <AppShell title="SPD por unidad geográfica">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Isla</label>
          <select
            value={isla}
            onChange={e => setIsla(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
          >
            {ISLAS_MOCK.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Agrupar por</label>
          <select
            value={grupo}
            onChange={e => setGrupo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark"
          >
            {GRUPOS.map(g => <option key={g}>{g}</option>)}
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

        <button
          onClick={() => console.log('Calcular StackSPD', { isla, grupo, trStart, trEnd })}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          Calcular
        </button>

      </div>

      {/* Resultados mock */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 h-96 flex items-center justify-center text-gray-400">
          El gráfico SPD apilado aparecerá aquí
        </div>
      </div>

    </AppShell>
  )
}
