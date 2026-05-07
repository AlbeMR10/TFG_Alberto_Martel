import type { CalibrationResult } from '../../types/api'

interface Props { data: CalibrationResult }

function fmtBCAD(y: number) {
  return y < 0 ? `${Math.abs(Math.round(y))} cal BC` : `${Math.round(y)} cal AD`
}

function maskToIntervals(bcad: number[], prob: number[], mask: boolean[]) {
  const ivs: [number, number][] = []
  let start: number | null = null
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && start === null) start = i
    else if (!mask[i] && start !== null) { ivs.push([start, i - 1]); start = null }
  }
  if (start !== null) ivs.push([start, mask.length - 1])
  return ivs.map(([a, b]) => ({
    from: bcad[a], to: bcad[b],
    pct:  (prob.slice(a, b + 1).reduce((s, v) => s + v, 0) * 100).toFixed(1),
  }))
}

export default function CalibrationSummaryTable({ data }: Props) {
  const iv1 = maskToIntervals(data.bcad, data.prob, data.inHpd1)
  const iv2 = maskToIntervals(data.bcad, data.prob, data.inHpd2)
  const n   = Math.max(iv1.length, iv2.length)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        Mediana:{' '}
        <span className="font-bold text-red-600">{fmtBCAD(data.median)}</span>
      </p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="bg-brand-dark text-white px-4 py-2 text-left font-medium">#</th>
            <th className="bg-brand-dark text-white px-4 py-2 text-left font-medium">HPD 1σ — 68.3%</th>
            <th className="bg-brand-dark text-white px-4 py-2 text-left font-medium">HPD 2σ — 95.4%</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: n }, (_, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="px-4 py-2 text-gray-500">{i + 1}</td>
              <td className="px-4 py-2 text-gray-700">
                {iv1[i] ? `${fmtBCAD(iv1[i].from)} – ${fmtBCAD(iv1[i].to)} (${iv1[i].pct}%)` : '—'}
              </td>
              <td className="px-4 py-2 text-gray-700">
                {iv2[i] ? `${fmtBCAD(iv2[i].from)} – ${fmtBCAD(iv2[i].to)} (${iv2[i].pct}%)` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
