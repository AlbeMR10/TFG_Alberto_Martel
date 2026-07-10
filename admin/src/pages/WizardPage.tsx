import { useState } from 'react'
import { api } from '../api'
import type { Muestra, BiblioInput, YacInput } from '../types'
import Paso1Biblio      from './wizard/Paso1Biblio'
import Paso2Yacimiento  from './wizard/Paso2Yacimiento'
import Paso3Muestra     from './wizard/Paso3Muestra'

interface Props {
  muestraEditar: Muestra | null
  onVolver: (mensaje?: string) => void
}

const PASOS = ['Bibliografía', 'Yacimiento', 'Muestra']

export default function WizardPage({ muestraEditar, onVolver }: Props) {
  const [paso, setPaso]           = useState(0)
  const [biblio, setBiblio]       = useState<BiblioInput | null>(
    muestraEditar?.id_biblio ? { tipo: 'existente', id: muestraEditar.id_biblio } : null
  )
  const [yac, setYac]             = useState<YacInput | null>(
    muestraEditar ? { tipo: 'existente', id: muestraEditar.id_yacimiento } : null
  )

  const handleGuardar = async (datosMuestra: object) => {
    const payload = { biblio, yacimiento: yac, ...datosMuestra }

    if (muestraEditar) {
      await api.editarCompleto(muestraEditar.id, payload)
      onVolver(`Muestra ${muestraEditar.IdMuestra} actualizada correctamente`)
    } else {
      await api.guardarCompleto(payload)
      onVolver('Muestra añadida correctamente')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cabecera */}
      <div className="bg-brand-dark border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button onClick={() => onVolver()} className="text-sm text-white/70 hover:text-white">
          ← Volver
        </button>
        <h1 className="text-lg font-semibold text-white">
          {muestraEditar ? `Editar muestra — ${muestraEditar.IdMuestra}` : 'Añadir muestra nueva'}
        </h1>
      </div>

      {/* Indicador de pasos */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-0 max-w-md">
          {PASOS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center gap-2 text-sm ${i === paso ? 'text-blue-600 font-semibold' : i < paso ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === paso ? 'bg-blue-600 text-white' : i < paso ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < paso ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < PASOS.length - 1 && (
                <div className={`w-8 h-px mx-2 ${i < paso ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {paso === 0 && (
          <Paso1Biblio
            inputInicial={biblio}
            onSiguiente={input => { setBiblio(input); setPaso(1) }}
          />
        )}
        {paso === 1 && (
          <Paso2Yacimiento
            inputInicial={yac}
            onAnterior={() => setPaso(0)}
            onSiguiente={input => { setYac(input); setPaso(2) }}
          />
        )}
        {paso === 2 && (
          <Paso3Muestra
            inicial={muestraEditar}
            onAnterior={() => setPaso(1)}
            onGuardar={handleGuardar}
          />
        )}
      </div>
    </div>
  )
}
