interface SliderProps {
  label:    string
  min:      number
  max:      number
  value:    number
  onChange: (value: number) => void
  unit?:    string
}

export default function Slider({ label, min, max, value, onChange, unit = '' }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-2">

      {/* Label + valor actual */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">{label}</label>
        <span className="text-xs font-bold text-white bg-brand-dark px-2 py-0.5 rounded-full">
          {value}{unit}
        </span>
      </div>

      {/* Track personalizado */}
    <div className="relative h-2 bg-gray-200 rounded-full">

    {/* Relleno hasta el valor actual */}
    <div
        className="absolute h-2 bg-brand-dark rounded-full transition-all duration-100"
        style={{ width: `${percentage}%` }}
    />

    {/* Thumb — círculo arrastrable */}
    <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand-dark rounded-full shadow-md pointer-events-none transition-all duration-100"
        style={{ left: `${percentage}%` }}
    />

    {/* Input range transparente encima */}
    <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
    />

    </div>


      {/* Mín y máx */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

    </div>
  )
}
