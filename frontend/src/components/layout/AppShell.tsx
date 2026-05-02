import React, { useState } from 'react'
import Sidebar from './SideBar'

interface AppShellProps {
  title:    string
  children: React.ReactNode
}

export default function AppShell({ title, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header ancho completo */}
      <header className="bg-brand-dark text-white px-6 py-4 flex items-center shrink-0">
        <img
            src="/logos/Logo_BdD.png"
            alt="14C Canarias"
            className="h-8 w-auto object-contain cursor-pointer"
            onClick={() => window.location.href = '/'}
        />
        <h1 className="text-lg font-semibold tracking-wide flex-1 text-center">{title}</h1>
    </header>

      {/* Cuerpo: sidebar + contenido */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

        {/* Área de contenido */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  )
}

