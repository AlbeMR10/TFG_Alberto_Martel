import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { SPDResult } from '../../types/api'
import { createCrosshairPlugin, interpolate } from './crosshairPlugin'

interface SPDChartProps {
  data:       SPDResult
  yacimiento: string
  runm:       number
}

export default function SPDChart({ data, yacimiento, runm }: SPDChartProps) {
  const crosshair = createCrosshairPlugin((xVal) => {
    const label    = xVal < 0
      ? `${Math.abs(Math.round(xVal))} cal BC`
      : `${Math.round(xVal)} cal AD`
    const spd      = interpolate(data.bcad, data.prob, xVal)
    const smoothed = interpolate(data.bcad, data.smoothed, xVal)
    return [label, `SPD: ${spd.toFixed(5)}`, `Media móvil: ${smoothed.toFixed(5)}`]
  })

  const chartData = {
    datasets: [
      {
        label:           'SPD',
        data:            data.bcad.map((x, i) => ({ x, y: data.prob[i] })),
        showLine:        true, tension: 0, pointRadius: 0,
        fill:            'origin' as any,
        backgroundColor: 'rgba(210, 50, 50, 0.30)',
        borderColor:     'rgba(180, 30, 30, 0.70)',
        borderWidth:     1,
      },
      {
        label:           `Media móvil (${runm} años)`,
        data:            data.bcad.map((x, i) => ({ x, y: data.smoothed[i] })),
        showLine:        true, tension: 0, pointRadius: 0,
        fill:            false as any,
        backgroundColor: 'transparent',
        borderColor:     'rgba(30, 80, 200, 0.90)',
        borderWidth:     2,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive:          true,
    maintainAspectRatio: false,
    animation:           false as any,
    plugins: {
      title: {
        display: true,
        text:    `${yacimiento}  (${data.nDates} fecha${data.nDates !== 1 ? 's' : ''})`,
        font:    { size: 14, weight: 'bold' },
        padding: { bottom: 8 },
      },
      legend: {
        position: 'bottom',
        labels:   { boxWidth: 14, padding: 16, font: { size: 11 } },
      },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        type:  'linear',
        title: { display: true, text: 'Years cal BC/AD' },
        ticks: { maxTicksLimit: 12, font: { size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        type:  'linear',
        min:   0,
        title: { display: true, text: 'Summed probability' },
        ticks: { callback: v => Number(v).toFixed(4), font: { size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} plugins={[crosshair]} />
    </div>
  )
}
