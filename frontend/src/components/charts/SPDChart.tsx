import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { SPDResult } from '../../types/api'

interface SPDChartProps {
  data: SPDResult
}

export default function SPDChart({ data }: SPDChartProps) {
  const labels = data.bcad.map(x => x < 0 ? `${Math.abs(x)} BC` : `${x} AD`)

  const chartData = {
    labels,
    datasets: [
      {
        label:           'SPD',
        data:            data.prob,
        borderColor:     'rgba(220, 50, 50, 0.8)',
        backgroundColor: 'rgba(220, 50, 50, 0.2)',
        borderWidth:     1,
        fill:            true,
        pointRadius:     0,
        tension:         0.2,
      },
      {
        label:           'Media móvil',
        data:            data.smoothed,
        borderColor:     'rgba(30, 58, 95, 0.9)',
        backgroundColor: 'transparent',
        borderWidth:     2,
        fill:            false,
        pointRadius:     0,
        tension:         0.3,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(5)}`
        }
      }
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 12, font: { size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        ticks: { font: { size: 11 } },
        grid:  { color: 'rgba(0,0,0,0.05)' },
      },
    },
  }

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  )
}