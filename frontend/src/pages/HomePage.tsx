import { useNavigate } from 'react-router-dom'
import PanelCard from '../components/ui/PanelCard'
import Footer from '../components/ui/Footer'

const panels = [
  {
    icon: '🗺️',
    title: 'Cartografiar',
    description: 'Visualiza la distribución geográfica de las dataciones en las Islas Canarias.',
    route: '/mapa',
  },
  {
    icon: '📅',
    title: 'Calibrar',
    description: 'Calibra una datación radiocarbónica individual con la curva IntCal.',
    route: '/calibracion',
  },
  {
    icon: '📈',
    title: 'SPD por yacimiento',
    description: 'Suma de probabilidades calibradas agrupadas por yacimiento arqueológico.',
    route: '/spd-yacimiento',
  },
  {
    icon: '📊',
    title: 'SPD por unidad geográfica',
    description: 'SPD apilado por isla, subdividido por categoría (vida, material, etc.).',
    route: '/spd-isla',
  },
  {
    icon: '👥',
    title: 'Paleodemografía',
    description: 'Test estadístico Monte Carlo sobre la dinámica poblacional histórica.',
    route: '/paleodemografia',
  },
  {
    icon: '📖',
    title: 'Sobre la app',
    description: 'Instrucciones y contexto sobre el proyecto 14C Canarias.',
    route: '/guia',
  },
]

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-dark border-b border-gray-200 px-8 py-10 text-center">
        <h1 className="text-3xl font-bold text-white">Holoceno 14C Canarias</h1>
        <p className="mt-2 text-white max-w-xl mx-auto">
          Plataforma de análisis de dataciones radiocarbónicas del proyecto
          14C Canarias de la Universidad de La Laguna.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {panels.map((panel) => (
            <PanelCard
              key={panel.route}
              icon={panel.icon}
              title={panel.title}
              description={panel.description}
              onClick={() => navigate(panel.route)}
            />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}