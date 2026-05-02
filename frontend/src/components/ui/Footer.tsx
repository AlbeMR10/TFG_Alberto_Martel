const entidades = [
    { imagen: '/logos/eii_ulpgc.png',  nombre: 'Escuela de Ingeniería e Informática — ULPGC'},
    { imagen: '/logos/geografia.png',  nombre: 'Dpto. de Geografía — ULL'  },
    { imagen: '/logos/Logo_BdD.png',   nombre: 'Base de Datos 14C-Canarias'         },
    { imagen: '/logos/Financiar.png',  nombre: 'Gobierno de España' },
]

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 px-8 py-10">

      <h2 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
        Entidades colaboradoras
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-10">
        {entidades.map((e) => (
          <div key={e.nombre} className="flex flex-col items-center gap-2">
            <img
              src={e.imagen}
              alt={e.nombre}
              className="h-16 w-auto object-contain transition-all duration-300"            />
            <span className="text-xs text-gray-400">{e.nombre}</span>
          </div>
        ))}
      </div>

    </footer>
  )
}