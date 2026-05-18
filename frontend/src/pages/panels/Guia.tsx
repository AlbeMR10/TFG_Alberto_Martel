import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PanelCard from '../../components/ui/PanelCard'
import Modal from '../../components/ui/Modal'

const panels = [
  {
    icon: '🗺️',
    title: 'Cartografiar',
    description: 'Visualiza las dataciones en el mapa según su valor BP.',
    modalContent: (
      <div className="space-y-3">
        <p>Visualiza las dataciones radiocarbónicas a partir del valor BP. Permite ver las fechas individualizadas o clusterizadas. Por defecto cartografía las dataciones clusterizadas. Se debe mover el slider para que la aplicación empiece a mostrar resultados.</p>
        <h3 className="font-semibold text-gray-800">Resultado</h3>
        <p>Cartografía todas las fechas disponibles iguales o menores a las indicadas en el slider. Si se activa la agrupación, las fechas se agrupan por grandes unidades administrativas. Situando el cursor sobre un punto, la app indica el nombre del yacimiento.</p>
      </div>
    ),
  },
  {
    icon: '📅',
    title: 'Calibrar',
    description: 'Calibra una datación individual con la curva IntCal.',
    modalContent: (
      <div className="space-y-3">
        <p>Calibra las dataciones radiocarbónicas seleccionando la fecha según su sigla (identificador de laboratorio). Por defecto utiliza la curva <strong>IntCal20</strong>. Puede seleccionarse la curva marina Marine20 e indicar el efecto reservorio correspondiente. Permite seleccionar si normalizar o no la fecha.</p>
        <h3 className="font-semibold text-gray-800">Resultado</h3>
        <p>Genera un gráfico con la calibración de la fecha y una tabla con la información básica de la datación. También genera una tabla con los rangos de calibración a 1 y 2 desviaciones. El formato de la calibración es en BC/AC.</p>
      </div>
    ),
  },
  {
    icon: '📈',
    title: 'SPD por yacimiento',
    description: 'Sumatorio de probabilidad agrupado por yacimiento.',
    modalContent: (
      <div className="space-y-3">
        <p>Calcula sumatorios de probabilidad por yacimientos. Debe seleccionarse el yacimiento de interés. Por defecto utiliza el rango <strong>2500–250 cal. BP</strong> y una suavización de 50 años.</p>
        <h3 className="font-semibold text-gray-800">Resultado</h3>
        <p>Representa la suma de probabilidad del yacimiento seleccionado y una línea con el ajuste del SPD según los años considerados. En la parte inferior se muestra la tabla con todas las fechas utilizadas.</p>
        <p className="text-amber-600 text-xs">Las dataciones del laboratorio GaK no se consideran para el SPD. Se utiliza la malacofauna sin corregir.</p>
      </div>
    ),
  },
  {
    icon: '📊',
    title: 'SPD por unidad geográfica',
    description: 'Compara SPD por isla y categoría.',
    modalContent: (
      <div className="space-y-3">
        <p>Compara sumatorios de probabilidad por unidad geográfica. Debe seleccionarse la isla de interés y la categoría a comparar. Por defecto utiliza el rango <strong>2500–250 cal. BP</strong>.</p>
        <h3 className="font-semibold text-gray-800">Resultado</h3>
        <p>Genera un gráfico con los diferentes SPD según la categoría que se está analizando.</p>
      </div>
    ),
  },
  {
    icon: '👥',
    title: 'Paleodemografía',
    description: 'Análisis del SPD con modelos teóricos de crecimiento.',
    modalContent: (
      <div className="space-y-3">
        <p>Elabora un análisis del SPD con modelos teóricos de crecimiento. Debe seleccionarse la isla y el modelo de crecimiento teórico. Por defecto usa el rango <strong>2500–250 cal. BP</strong>, una unidad de análisis de 50 años y 2 repeticiones Monte Carlo (máximo 100).</p>
        <h3 className="font-semibold text-gray-800">Resultado</h3>
        <p>Representa los análisis paleodemográficos en dos gráficos: el SPD con intervalos de confianza y desviaciones estadísticas, y los ratios de crecimiento de la isla analizada.</p>
        <p className="text-amber-600 text-xs">Los resultados son para ejemplificar la potencialidad de este tipo de análisis.</p>
      </div>
    ),
  },
]

const bibliography = [
  'Chang, W. et al. (2022). shiny: Web Application Framework for R. R package version 1.7.2.9000.',
  'Crema, E., Bevan, A. (2021). Inference from large sets of radiocarbon dates: software and methods. Radiocarbon, 23–39. https://doi.org/10.1017/RDC.2020.95',
  'Heaton, T. et al. (2020). Marine20 — The Marine Radiocarbon Age Calibration Curve (0–55,000 cal BP). Radiocarbon, 62(4), 779–820.',
  'Pardo-Gordó, S. et al. (2023). An interactive radiocarbon database for the Canary Islands. Zenodo. https://doi.org/10.5281/zenodo.7621889',
  'Pardo-Gordó, S. et al. (2022). Dataciones de contextos aborígenes y coloniales de la isla de Gran Canaria. Tabona, 22, 217–241.',
  'R Core Team (2021). R: A Language and Environment for Statistical Computing. https://www.R-project.org/',
  'Reimer, P. et al. (2020). The IntCal20 Northern Hemisphere radiocarbon age calibration curve (0–55 cal kBP). Radiocarbon, 62(4), 725–757.',
]

export default function GuidePage() {
  const navigate = useNavigate()
  const [openPanel, setOpenPanel] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Cabecera */}
      <header className="bg-brand-dark border-b border-gray-200 px-8 py-6 relative">
        {/* Botón volver — esquina superior izquierda */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-8 text-sm text-white hover:text-gray-600 transition-colors flex items-center gap-1"
        >
          ← Volver
        </button>

        {/* Título centrado */}
        <h1 className="text-2xl font-bold text-white text-center">Guía de uso</h1>

      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-12">

        {/* Descripción general */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Sobre la aplicación</h2>
          <p className="text-gray-600 leading-relaxed">
            Esta aplicación interactiva permite consultar toda la información radiométrica disponible 
            para las Islas Canarias desde el periodo aborigen al colonial (Pardo-Gordó et al., 2023). 
            Esta base de datos dispone de diferentes procesos para explorar las dataciones absolutas. 
            Todo el análisis radiocarbónico se basa en el paquete Rcarbon (Crema y Bevan, 2020) asociado 
            al software estadístico R (R Core Team, 2021).
          </p>
        </section>

        {/* Cómo usar cada panel */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Cómo usar cada panel</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {panels.map((panel, i) => (
              <PanelCard
                key={panel.title}
                icon={panel.icon}
                title={panel.title}
                description={panel.description}
                onClick={() => setOpenPanel(i)}
              />
            ))}
          </div>
        </section>

        {/* Cómo citar */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Cómo citar</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Pardo-Gordó, S., Vidal-Matutano, P., González-Marrero, M.C., Chávez-Álvarez, M.E. (2023).
            The <sup>14</sup>C Canarias web application: An interactive radiocarbon database for the Canary Islands.{' '}
            <em>Journal of Open Archaeology Data.</em> 11:4, pp. 1–6.{' '}
            <a href="https://doi.org/10.5334/joad.105" target="_blank" rel="noreferrer"
              className="text-blue-500 hover:underline">
              https://doi.org/10.5334/joad.105
            </a>
          </p>
        </section>

        {/* Bibliografía */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bibliografía</h2>
          <ul className="space-y-3">
            {bibliography.map((ref, i) => (
              <li key={i} className="text-sm text-gray-500 leading-relaxed pl-4 border-l-2 border-gray-200">
                {ref}
              </li>
            ))}
          </ul>
        </section>

        {/* Contacto */}
        <section className="text-center text-sm text-gray-400 pb-8">
          <p className="font-medium text-gray-600">Gestión y actualización</p>
          <p>Salvador Pardo-Gordó</p>
          <p>Departamento de Geografía e Historia — Universidad de La Laguna</p>
          <a href="mailto:spardogo@ull.edu.es" className="text-blue-400 hover:underline">
            spardogo@ull.edu.es
          </a>
        </section>

      </main>

      {/* Modal */}
      {openPanel !== null && (
        <Modal
          isOpen={openPanel !== null}
          onClose={() => setOpenPanel(null)}
          title={panels[openPanel].title}
        >
          {panels[openPanel].modalContent}
        </Modal>
      )}

    </div>
  )
}
