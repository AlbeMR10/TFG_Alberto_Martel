import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { StackSPDResult } from '../../types/api'
import { createCrosshairPlugin, interpolate } from './crosshairPlugin'

interface StackSPDChartProps {
  data:    StackSPDResult
  isla:    string
  groupBy: string
}

const PALETTE = [
  { fill: 'rgba(210,  50,  50, 0.30)', line: 'rgba(180,  30,  30, 0.80)' },
  { fill: 'rgba( 50, 130, 210, 0.30)', line: 'rgba( 30,  80, 180, 0.80)' },
  { fill: 'rgba( 50, 170,  80, 0.30)', line: 'rgba( 30, 130,  50, 0.80)' },
  { fill: 'rgba(200, 130,  30, 0.30)', line: 'rgba(160,  90,  10, 0.80)' },
  { fill: 'rgba(130,  50, 200, 0.30)', line: 'rgba( 90,  20, 160, 0.80)' },
  { fill: 'rgba( 30, 180, 180, 0.30)', line: 'rgba( 10, 130, 130, 0.80)' },
]

export default function StackSPDChart({ data, isla, groupBy }: StackSPDChartProps) {
  const grupos = Object.keys(data).sort((a, b) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  )

  // Shared Y scale across all panels (same as R multipanel sharex/sharey)
  let yMax = 0
  for (const g of grupos) {
    const maxG = Math.max(...data[g].prob)
    if (maxG > yMax) yMax = maxG
  }
  yMax = isFinite(yMax) && yMax > 0 ? yMax * 1.05 : 1

  return (
    <div className="flex flex-col gap-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
        SPD — {isla} · agrupado por {groupBy}
        <span className="ml-2 text-xs font-normal text-gray-400">
          ({grupos.length} categoría{grupos.length !== 1 ? 's' : ''})
        </span>
      </h3>

      {/* Layout unificado: label Y rotado a la izquierda + paneles */}
      <div className="flex">

        {/* Etiqueta Y única, centrada verticalmente */}
        <div className="flex items-center justify-center flex-shrink-0" style={{ width: '22px' }}>
          <span style={{
            transform:   'rotate(-90deg)',
            whiteSpace:  'nowrap',
            fontSize:    '11px',
            color:       '#555',
            fontFamily:  'system-ui, sans-serif',
          }}>
            Summed Probability
          </span>
        </div>

        {/* Columna de paneles */}
        <div className="flex flex-col flex-1">
          {grupos.map((g, idx) => {
            const d      = data[g]
            const color  = PALETTE[idx % PALETTE.length]
            const isLast = idx === grupos.length - 1

            const crosshair = createCrosshairPlugin((xVal) => {
              const label = xVal < 0
                ? `${Math.abs(Math.round(xVal))} cal BC`
                : `${Math.round(xVal)} cal AD`
              const spd = interpolate(d.bcad, d.prob, xVal)
              return [label, `${g}: ${spd.toFixed(5)}`]
            })

            const chartData = {
              datasets: [
                {
                  label:           g,
                  data:            d.bcad.map((x, i) => ({ x, y: d.prob[i] })),
                  showLine:        true, tension: 0, pointRadius: 0,
                  fill:            'origin' as any,
                  backgroundColor: color.fill,
                  borderColor:     color.line,
                  borderWidth:     1,
                },
              ],
            }

            const options: ChartOptions<'line'> = {
              responsive:          true,
              maintainAspectRatio: false,
              animation:           false as any,
              plugins: {
                legend:  { display: false },
                tooltip: { enabled: false },
                title:   { display: false },
              },
              scales: {
                x: {
                  type:  'linear',
                  title: { display: isLast, text: 'Years cal BC/AD' },
                  ticks: { maxTicksLimit: 12, font: { size: 10 } },
                  grid:  { color: 'rgba(0,0,0,0.05)' },
                },
                y: {
                  type:  'linear',
                  min:   0,
                  max:   yMax,
                  title: { display: false },
                  ticks: { callback: v => Number(v).toFixed(4), maxTicksLimit: 4, font: { size: 10 } },
                  grid:  { color: 'rgba(0,0,0,0.05)' },
                },
              },
            }

            return (
              <div
                key={g}
                className={!isLast ? 'border-b border-gray-100 mb-3' : ''}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 pt-2">
                  {g}
                </p>
                <div style={{ height: '160px' }}>
                  <Line data={chartData} options={options} plugins={[crosshair]} />
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
