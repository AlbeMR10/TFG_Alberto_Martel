import { useState } from 'react'
import AppShell from '../../components/layout/AppShell'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import CalibrationChart from '../../components/charts/CalibrationChart'
import CalibrationInfoTable from '../../components/ui/CalibrationInfoTable'
import CalibrationSummaryTable from '../../components/ui/CalibrationSummaryTable'
import { useMuestras } from '../../hooks/useMuestras'
import { useCalibration } from '../../hooks/useCalibration'

const CURVAS = ['intcal20', 'intcal13', 'marine20', 'marine13']

export default function Panel2Calibration() {
  const [muestra,       setMuestra]       = useState('')
  const [curva,         setCurva]         = useState('intcal20')
  const [deltaRStr,     setDeltaRStr]     = useState('0')
  const [errorDeltaStr, setErrorDeltaStr] = useState('0')
  const [normalizar,    setNormalizar]    = useState(false)
  const [calcular,      setCalcular]      = useState(false)

  const deltaR      = parseInt(deltaRStr)     || 0
  const errorDeltaR = parseInt(errorDeltaStr) || 0

  const { data: muestras, isLoading: loadingMuestras } = useMuestras()

  const sortedMuestras = [...(muestras ?? [])].sort((a, b) => a.IdMuestra.localeCompare(b.IdMuestra))
  const muestraActual  = muestra || sortedMuestras[0]?.IdMuestra || ''
  const muestraInfo    = muestras?.find(m => m.IdMuestra === muestraActual)

  const { data, isLoading, error } = useCalibration(
    { idMuestra: muestraActual, calCurve: curva, resOffset: deltaR, resError: errorDeltaR, normalised: normalizar },
    calcular && !!muestraActual
  )

  return (
    <AppShell title="Calibración individual">

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-end justify-center gap-4">
        <Select
          label="Id-Muestra"
          value={muestraActual}
          onChange={v => { setMuestra(v); setCalcular(false) }}
          options={loadingMuestras
            ? [{ value: '', label: 'Cargando...' }]
            : [...(muestras ?? [])].sort((a, b) => a.IdMuestra.localeCompare(b.IdMuestra)).map(m => ({ value: m.IdMuestra, label: m.IdMuestra }))}
        />
        <Select
          label="Curva de calibración"
          value={curva}
          onChange={v => { setCurva(v); setCalcular(false) }}
          options={CURVAS.map(c => ({ value: c, label: c }))}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">DeltaR</label>
          <input type="number" value={deltaRStr}
            onChange={e => { setDeltaRStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Error DeltaR</label>
          <input type="number" value={errorDeltaStr}
            onChange={e => { setErrorDeltaStr(e.target.value); setCalcular(false) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-brand-dark"
          />
        </div>
        <Select
          label="Normalizar"
          value={String(normalizar)}
          onChange={v => { setNormalizar(v === 'true'); setCalcular(false) }}
          options={[{ value: 'false', label: 'No' }, { value: 'true', label: 'Sí' }]}
        />
        <button
          onClick={() => setCalcular(true)}
          disabled={!muestraActual || isLoading}
          className="bg-brand-dark text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-mid transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Gráfica */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 h-[480px]">
          {!calcular && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Selecciona una muestra y pulsa Calcular
            </div>
          )}
          {calcular && isLoading && <Spinner />}
          {calcular && error     && <ErrorMessage message={error.message} />}
          {calcular && data && muestraInfo && (
            <CalibrationChart data={data} bp={muestraInfo.BP} sd={muestraInfo.SD} yacimiento={muestraInfo.Yacimiento} />
          )}
        </div>

        {/* Tabla de información */}
        {calcular && data && muestraInfo && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Información principal fecha calibrada
            </h2>
            <CalibrationInfoTable muestra={muestraInfo} />
          </div>
        )}

        {/* Tabla de calibración */}
        {calcular && data && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Tabla de calibración
            </h2>
            <CalibrationSummaryTable data={data} />
          </div>
        )}

      </div>
    </AppShell>
  )
}
