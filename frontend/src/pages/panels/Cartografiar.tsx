import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import AppShell from '../../components/layout/AppShell'
import Slider from '../../components/ui/Slider'
import Select from '../../components/ui/Select'
import { useMuestras } from '../../hooks/useMuestras'

// ColorBrewer "Greens" 9 clases — igual que colorBin("Greens", BP, 9) en R
const GREENS = [
  '#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b',
  '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b',
]

const BP_MIN = 40
const BP_MAX = 3000
const N_BINS = 9

function getBpColor(bp: number): string {
  const clamped = Math.max(BP_MIN, Math.min(BP_MAX, bp))
  const idx     = Math.min(N_BINS - 1, Math.floor((clamped - BP_MIN) / (BP_MAX - BP_MIN) * N_BINS))
  return GREENS[idx]
}

// Etiquetas de la leyenda (mismos cortes que colorBin)
const BREAKS = Array.from({ length: N_BINS }, (_, i) => ({
  color: GREENS[i],
  from:  Math.round(BP_MIN + (i / N_BINS)       * (BP_MAX - BP_MIN)),
  to:    Math.round(BP_MIN + ((i + 1) / N_BINS) * (BP_MAX - BP_MIN)),
}))

export default function Panel1Map() {
  const [bp,           setBp]           = useState(1800)
  const [cluster,      setCluster]      = useState(true)
  const [panelAbierto, setPanelAbierto] = useState(false)

  const { data: muestras } = useMuestras()
  const filtered = (muestras ?? []).filter(m => m.BP <= bp && m.Lat && m.Lon)

  const markers = filtered.map(m => (
    <CircleMarker
      key={m.IdMuestra}
      center={[m.Lat, m.Lon]}
      radius={4}
      pathOptions={{
        fillColor:   getBpColor(m.BP),
        fillOpacity: 0.85,
        stroke:      false,
        color:       'transparent',
      }}
    >
      <Tooltip>{m.Yacimiento}</Tooltip>
    </CircleMarker>
  ))

  return (
    <AppShell title="Cartografiar" mainClassName="overflow-hidden">
      <div className="relative w-full h-full">

        {/* Mapa — clic fuera del panel lo cierra */}
        <div className="absolute inset-0" onClick={() => setPanelAbierto(false)}>
          <MapContainer
            center={[28.5, -15.9]}
            zoom={7.5}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            />

            {cluster
              ? <MarkerClusterGroup>{markers}</MarkerClusterGroup>
              : markers
            }
          </MapContainer>
        </div>

        {/* Leyenda BP — solo en modo individual */}
        {!cluster && (
          <div
            className="absolute bottom-8 left-4 z-[1000] bg-white rounded-xl shadow-lg p-3 text-xs pointer-events-none"
          >
            <p className="font-semibold text-gray-700 mb-2">Before Present</p>
            {[...BREAKS].reverse().map(b => (
              <div key={b.from} className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-4 h-3 rounded-sm flex-shrink-0 border border-gray-200"
                  style={{ backgroundColor: b.color }}
                />
                <span className="text-gray-600">{b.from}–{b.to}</span>
              </div>
            ))}
          </div>
        )}

        {/* Controles flotantes */}
        <div className="absolute top-4 left-14 z-[1000] flex flex-col gap-2">

          <button
            onClick={e => { e.stopPropagation(); setPanelAbierto(p => !p) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-md transition-colors
              ${panelAbierto
                ? 'bg-brand-dark text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          >
            🎚️ Filtros
          </button>

          {panelAbierto && (
            <div
              className="bg-white rounded-2xl shadow-xl p-4 w-64 flex flex-col gap-5"
              onClick={e => e.stopPropagation()}
            >
              <Slider
                label="Dataciones según BP"
                min={40}
                max={3500}
                value={bp}
                onChange={setBp}
                unit=" BP"
              />
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
