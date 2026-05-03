interface SelectProps {
  label:    string
  value:    string
  onChange: (value: string) => void
  options:  { value: string; label: string }[]
}

export default function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-dark cursor-pointer"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {/* Flecha personalizada */}
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
          ▾
        </div>
      </div>
    </div>
  )
}
