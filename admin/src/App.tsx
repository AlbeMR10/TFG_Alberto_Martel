import { useState } from 'react'
import MuestrasPage from './pages/MuestrasPage'
import FormularioMuestraPage from './pages/FormularioMuestraPage'
import type { Muestra } from './types'

type Vista = 'tabla' | 'formulario'

export default function App() {
  const [vista, setVista]               = useState<Vista>('tabla')
  const [muestraEditar, setMuestraEditar] = useState<Muestra | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | undefined>()

  if (vista === 'formulario') {
    return (
      <FormularioMuestraPage
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
      onAnadir={() => { setMuestraEditar(null); setVista('formulario') }}
      onEditar={m => { setMuestraEditar(m); setVista('formulario') }}
    />
  )
}
