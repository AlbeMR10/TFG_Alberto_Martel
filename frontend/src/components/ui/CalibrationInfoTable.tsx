import type { Muestra } from '../../types/api'

interface Props { muestra: Muestra }

const COLS: [keyof Muestra, string][] = [
  ['Yacimiento', 'Yacimiento'], ['Isla', 'Isla'],
  ['IdMuestra',  'Id-Muestra'], ['BP', 'BP'], ['SD', 'SD'],
  ['Higiene',    'Higiene'],    ['Contexto_Est', 'Contexto'],
  ['Vida',       'Vida'],       ['Material', 'Material'],
  ['Especie',    'Especie'],    ['Adscripcion', 'Adscripción'],
  ['Referencia', 'Referencia'], ['Id_BibTeX', 'Id BibTeX'],
]

export default function CalibrationInfoTable({ muestra }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {COLS.map(([, label]) => (
              <th key={label} className="bg-gray-50 text-gray-500 font-medium px-3 py-2 border border-gray-200 text-left whitespace-nowrap">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {COLS.map(([key, label]) => (
              <td key={label} className="px-3 py-2 border border-gray-200 text-gray-700 whitespace-nowrap">
                {String(muestra[key] ?? '')}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
