import { NavLink } from 'react-router-dom'

const navItems = [
  { icon: '🗺️', label: 'Cartografiar',        path: '/mapa'           },
  { icon: '📅', label: 'Calibrar',             path: '/calibracion'    },
  { icon: '📈', label: 'SPD Yacimiento',       path: '/spd-yacimiento' },
  { icon: '📊', label: 'SPD Isla',             path: '/spd-isla'       },
  { icon: '👥', label: 'Paleodemografía',      path: '/paleodemografia'},
]

interface SidebarProps {
  collapsed: boolean
  onToggle:  () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={`
      bg-white border-r border-gray-200 flex flex-col shrink-0
      transition-all duration-300
      ${collapsed ? 'w-16' : 'w-56'}
    `}>

      {/* Botón hamburguesa */}
      <button
         onClick={onToggle}
        className="flex items-center h-12 px-4 text-gray-400 hover:text-brand-dark transition-colors border-b border-gray-100 w-full"
        aria-label="Toggle sidebar"
    >
        ☰
    </button>


      <nav className="flex flex-col gap-1 p-2 mt-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-colors duration-150 text-sm font-medium
              ${isActive
                ? 'bg-brand-dark text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}
            `}
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}