interface ModalProps {
  isOpen:      boolean
  onClose:     () => void
  title:       string
  children:    React.ReactNode
  headerColor?: string   // ej: '#1e3a5f'
}

export default function Modal({ isOpen, onClose, title, children, headerColor = '#1e3a5f' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera de color */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-2xl relative"
          style={{ backgroundColor: headerColor }}
        >
          <h2 className="text-lg font-semibold text-white w-full text-center">{title}</h2>
          <button
            onClick={onClose}
            className="absolute right-4 text-white/70 hover:text-white transition-colors text-xl leading-none"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto px-6 py-5 text-sm text-gray-600 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}
