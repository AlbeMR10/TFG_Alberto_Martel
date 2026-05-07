import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import type { StackSPDResult } from '../../types/api'

interface StackSPDChartProps {
  data: StackSPDResult
}

const COLORS = [
  'rgba(30,  58,  95,  0.8)',
  'rgba(220, 50,  50,  0.8)',
  'rgba(50,  180, 100, 0.8)',
  'rgba(200, 120, 30,  0.8)',
  'rgba(120, 50,  180, 0.8)',
]

export default function StackSPDChart({ data }: StackSPDChartProps) {
  const groups  = Object.keys(data)
  const labels  = data[groups[0]].bcad.map(x => x < 0 ? `${Math.abs(x)} BC` : `${x} AD`)

  const chartData = {
    labels,
    datasets: groups.map((group, i) => ({
      label:           group,
      data:            data[group].prob,
      borderColor:     COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length].replace('0.8', '0.1'),
      borderWidth:     2,
      fill:            false,
      pointRadius:     0,
      tension:         0.2,
    })),
  }

  const options: ChartOptions<'line'> = {
    responsive:          true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
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
