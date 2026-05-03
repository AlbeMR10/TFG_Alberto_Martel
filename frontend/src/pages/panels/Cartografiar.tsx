import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Slider from '../../components/ui/Slider'
import Select from '../../components/ui/Select'

export default function Panel1Map() {
  const [bp,          setBp]          = useState(1800)
  const [cluster,     setCluster]     = useState(true)
  const [panelAbierto,setPanelAbierto]= useState(false)

  return (
    <AppShell title="Cartografiar" mainClassName="overflow-hidden">

      <div className="relative w-full h-full">

        {/* Mapa — cierra el panel al hacer clic */}
        <div
          className="absolute inset-0 bg-blue-50 flex items-center justify-center text-gray-400 text-sm"
          onClick={() => setPanelAbierto(false)}
        >
          El mapa Leaflet aparecerá aquí
        </div>

        {/* Controles flotantes */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">

          {/* Botón único */}
          <button
            onClick={e => { e.stopPropagation(); setPanelAbierto(p => !p) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-colors
              ${panelAbierto
                ? 'bg-brand-dark text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            🎚️ Filtros
          </button>

          {/* Panel desplegable con ambos filtros */}
          {panelAbierto && (
            <div
              className="bg-white rounded-2xl shadow-xl p-4 w-64 flex flex-col gap-5"
              onClick={e => e.stopPropagation()}
            >

              {/* Slider BP */}
              <Slider
                label="Dataciones según BP"
                min={40}
                max={3500}
                value={bp}
                onChange={setBp}
                unit=" BP"
              />

              {/* Selector cluster */}
              <Select
                label="¿Agrupar dataciones?"
                value={cluster ? 'yes' : 'no'}
                onChange={v => setCluster(v === 'yes')}
                options={[
                  { value: 'yes', label: 'Sí' },
                  { value: 'no',  label: 'No' },
                ]}
              />

            </div>
          )}

        </div>
      </div>

    </AppShell>
  )
}
