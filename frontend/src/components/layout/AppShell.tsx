import React, { useState } from 'react'
import Sidebar from './Sidebar'

interface AppShellProps {
  title:          string
  children:       React.ReactNode
  mainClassName?: string
}

export default function AppShell({ title, children, mainClassName }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header ancho completo */}
      <header className="bg-brand-dark text-white px-6 py-4 flex items-center shrink-0">
        <button
          onClick={() => window.location.href = '/'}
          className="bg-brand-dark rounded-xl px-3 py-1.5 hover:bg-brand-mid hover:scale-105 transition-all duration-200 flex items-center flex-shrink-0"
        >
          <img
            src="/logos/Logo_BdD.png"
            alt="14C Canarias"
            className="h-14 w-auto object-contain"
          />
        </button>
        <h1 className="text-lg font-semibold tracking-wide flex-1 text-center">{title}</h1>
    </header>

      {/* Cuerpo: sidebar + contenido */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

        {/* Área de contenido */}
        <main className={`flex-1 ${mainClassName ?? 'overflow-auto'}`}>
          {children}
        </main>
      </div>

    </div>
  )
}

