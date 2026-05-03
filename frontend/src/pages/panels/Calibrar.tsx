import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'

const MUESTRAS_MOCK = ['Beta-539739', 'Beta-539740', 'Beta-539741', 'GaK-1234']
const CURVAS = ['intcal20', 'intcal13', 'marine20', 'marine13']

export default function Panel2Calibration() {
  const [muestra,    setMuestra]    = useState(MUESTRAS_MOCK[0])
  const [curva,      setCurva]      = useState('intcal20')
  const [deltaR,     setDeltaR]     = useState(0)
  const [errorDeltaR,setErrorDeltaR]= useState(0)
  const [normalizar, setNormalizar] = useState(false)

  return (
    <AppShell title="Calibrar">

      {/* Barra de filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">


        {/* Muestra */}
        <Select
          label="Id-Muestra"
          value={muestra}
          onChange={setMuestra}
          options={MUESTRAS_MOCK.map(m => ({ value: m, label: m }))}
        />

        {/* Curva */}
        <Select
          label="Curva de calibración"
          value={curva}
          onChange={setCurva}
          options={CURVAS.map(c => ({ value: c, label: c }))}
        />

        {/* DeltaR */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">DeltaR</label>
          <input
            type="number"
            value={deltaR}
            onChange={e => setDeltaR(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        {/* Error DeltaR */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Error DeltaR</label>
          <input
            type="number"
            value={errorDeltaR}
            onChange={e => setErrorDeltaR(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>

        {/* Normalizar */}
        <Select
          label="Normalizar"
          value={String(normalizar)}
          onChange={v => setNormalizar(v === 'true')}
          options={[
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Sí' },
          ]}
        />

        {/* Botón calcular */}
        <button
          onClick={() => console.log('Calcular', { muestra, curva, deltaR, errorDeltaR, normalizar })}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors"
        >
          Calcular
        </button>

      </div>

      {/* Área de resultados (mock por ahora) */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 h-96 flex items-center justify-center text-gray-400">
          El gráfico de calibración aparecerá aquí
        </div>
      </div>

    </AppShell>
  )
}