import { Line } from 'react-chartjs-2'
import type { ChartOptions, Plugin } from 'chart.js'
import type { CalibrationResult } from '../../types/api'
import { createCrosshairPlugin, interpolate } from './crosshairPlugin'

interface CalibrationChartProps {
  data:       CalibrationResult
  bp:         number
  sd:         number
  yacimiento: string
}

function gauss(x: number, mean: number, sd: number) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2)
}

export default function CalibrationChart({ data, bp, sd, yacimiento }: CalibrationChartProps) {
  const pad        = 150
  const xMin       = Math.min(...data.bcad) - pad
  const xMax       = Math.max(...data.bcad) + pad
  const maxProb    = Math.max(...data.prob)

  // Rango C14 visible: solo la porción de la curva dentro de la ventana x
  const visible = data.curveBcad
    .map((x, i) => ({ x, c14: data.curveC14[i], err: data.curveError[i] }))
    .filter(v => v.x >= xMin && v.x <= xMax)

  const c14Min = Math.min(
    ...(visible.length ? visible.map(v => v.c14 - v.err) : [bp]),
    bp - 3.5 * sd
  )
  const c14Max = Math.max(
    ...(visible.length ? visible.map(v => v.c14 + v.err) : [bp]),
    bp + 3.5 * sd
  )

  // rcarbon usa hscale=0.3 por defecto:
  // la distribución ocupa el 30% inferior del rango C14,
  // convertida a unidades BP para compartir el mismo eje.
  const hscale    = 0.3
  const c14Range  = c14Max - c14Min
  const probAreaH  = hscale * c14Range      // altura en BP que ocupa la distribución
  const gaussWidth = probAreaH             // mismo escalado que rcarbon: anchura = altura de la zona de distribución
  const probBase  = c14Min - probAreaH     // BP donde prob = 0

  const c14AxisMin = probBase - 15
  const c14AxisMax = c14Max + 15

  // Convierte probabilidad → posición en el eje BP (misma lógica que rcarbon)
  const toC14 = (p: number) => probBase + (p / maxProb) * probAreaH

  // Crosshair: línea vertical + tooltip con año, BP de la curva y probabilidad
  const crosshair = createCrosshairPlugin((xVal) => {
    const label   = xVal < 0
      ? `${Math.abs(Math.round(xVal))} cal BC`
      : `${Math.round(xVal)} cal AD`
    const curveBP = Math.round(interpolate(data.curveBcad, data.curveC14, xVal))
    const prob    = interpolate(data.bcad, data.prob, xVal)
    return [label, `Curva: ${curveBP} BP`, `Prob:  ${prob.toFixed(4)}`]
  })

  // Plugin canvas: dibuja el polígono relleno de la gaussiana horizontal
  const gaussPlugin: Plugin<'line'> = {
    id: 'gaussFill',
    beforeDatasetsDraw(chart) {
      const { ctx, scales } = chart as any
      const xScale = scales.x
      const yC14   = scales.yC14
      if (!xScale || !yC14) return

      ctx.save()
      ctx.beginPath()
      let first = true
      for (let c14 = bp - 3.5 * sd; c14 <= bp + 3.5 * sd; c14 += 0.5) {
        const px = xScale.getPixelForValue(xMin + gauss(c14, bp, sd) * gaussWidth)
        const py = yC14.getPixelForValue(c14)
        if (first) { ctx.moveTo(px, py); first = false }
        else ctx.lineTo(px, py)
      }
      const baseX = xScale.getPixelForValue(xMin)
      ctx.lineTo(baseX, yC14.getPixelForValue(bp + 3.5 * sd))
      ctx.lineTo(baseX, yC14.getPixelForValue(bp - 3.5 * sd))
      ctx.closePath()
      ctx.fillStyle   = 'rgba(100,210,120,0.40)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(80,180,100,0.80)'
      ctx.lineWidth   = 1
      ctx.stroke()
      ctx.restore()
    },
  }

  const chartData = {
    datasets: [
      // Entrada ficticia solo para la leyenda (el polígono lo pinta gaussPlugin)
      {
        label:           `Medida: ${bp} ± ${sd} BP`,
        data:            [] as {x:number,y:number}[],
        backgroundColor: 'rgba(100,210,120,0.40)',
        borderColor:     'rgba(80,180,100,0.80)',
        borderWidth:     1,
        pointRadius:     0,
        yAxisID:         'yC14',
      },
      // Curva IntCal20 (naranja)
      {
        label:       'Curva IntCal20',
        data:        data.curveBcad.map((x, i) => ({ x, y: data.curveC14[i] })),
        showLine:    true, tension: 0, pointRadius: 0,
        fill:        false as any,
        borderColor: 'rgba(220,150,20,0.95)', borderWidth: 4,
        yAxisID:     'yC14',
      },
      // Distribución calibrada completa (gris claro) — mapeada al eje C14
      {
        label:           'Distribución calibrada',
        data:            data.bcad.map((x, i) => ({ x, y: toC14(data.prob[i]) })),
        showLine:        true, tension: 0, pointRadius: 0,
        fill:            { value: probBase } as any,
        backgroundColor: 'rgba(120,120,120,0.20)',
        borderColor:     'transparent',
        yAxisID:         'yC14',
      },
      // HPD 2σ 95.4% (gris oscuro) — mapeado al eje C14
      {
        label:           'HPD (95.4% / 68.3%)',
        data:            data.bcad.map((x, i) => ({
          x,
          y: toC14(data.prob[i] * (data.inHpd2[i] ? 1 : 0)),
        })),
        showLine:        true, tension: 0, pointRadius: 0,
        fill:            { value: probBase } as any,
        backgroundColor: 'rgba(70,70,70,0.68)',
        borderColor:     'transparent',
        yAxisID:         'yC14',
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    animation:  false as any,
    plugins: {
      title: {
        display: true,
        text:    yacimiento,
        font:    { size: 14, weight: 'bold' },
        padding: { bottom: 8 },
      },
      legend: {
        position: 'bottom',
        labels: {
          filter:    item => item.text !== '',
          boxWidth:  14,
          padding:   16,
          font:      { size: 11 },
        },
      },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        type:  'linear',
        min:   xMin,
        max:   xMax,
        title: { display: true, text: 'Years AD/BC' },
        ticks: { maxTicksLimit: 12, font: { size: 11 } },
      },
      yC14: {
        type: 'linear', position: 'left',
        min:  c14AxisMin, max: c14AxisMax,
        title: { display: true, text: 'Radiocarbon Age (BP)' },
        grid:  { color: 'rgba(0,0,0,0.05)' },
      },
      // Eje derecho de anotación: mismo rango de píxeles que yC14,
      // pero muestra valores de densidad de probabilidad (como hace rcarbon)
      yProb: {
        type: 'linear', position: 'right',
        min:  c14AxisMin, max: c14AxisMax,
        title: { display: true, text: 'Densidad de probabilidad' },
        grid:  { drawOnChartArea: false },
        afterBuildTicks: ((axis: any) => {
          axis.ticks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
            value: toC14(f * maxProb),
            major: false,
          }))
        }) as any,
        ticks: {
          callback: (val) => {
            const p = (Number(val) - probBase) / probAreaH * maxProb
            if (p < -0.0001 || p > maxProb * 1.001) return ''
            return p.toFixed(3)
          },
        },
      },
    },
  }

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} plugins={[gaussPlugin, crosshair]} />
    </div>
  )
}
