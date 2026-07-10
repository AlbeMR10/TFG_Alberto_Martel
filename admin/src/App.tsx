import { useState } from 'react'
import MuestrasPage from './pages/MuestrasPage'
import WizardPage   from './pages/WizardPage'
import type { Muestra } from './types'

type Vista = 'tabla' | 'wizard'

export default function App() {
  const [vista, setVista]               = useState<Vista>('tabla')
  const [muestraEditar, setMuestraEditar] = useState<Muestra | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | undefined>()

  if (vista === 'wizard') {
    return (
      <WizardPage
        muestraEditar={muestraEditar}
        onVolver={msg => {
          setMensajeExito(msg)
          setVista('tabla')
        }}
      />
    )
  }

  return (
    <MuestrasPage
      mensajeInicial={mensajeExito}
      onMensajeVisto={() => setMensajeExito(undefined)}
      onAnadir={() => { setMuestraEditar(null); setVista('wizard') }}
      onEditar={m => { setMuestraEditar(m); setVista('wizard') }}
    />
  )
}
