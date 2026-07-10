import type { Plugin } from 'chart.js'

export function createCrosshairPlugin(
  getLines: (xValue: number) => string[]
): Plugin<'line'> {
  let cursorX: number | null = null

  return {
    id: 'crosshair',

    afterEvent(_chart, args) {
      const type = args.event.type
      if (type === 'mousemove') {
        cursorX      = args.event.x ?? null
        args.changed = true
      } else if (type === 'mouseout') {
        cursorX      = null
        args.changed = true
      }
    },

    afterDatasetsDraw(chart) {
      if (cursorX === null) return
      const { ctx, chartArea, scales } = chart as any
      if (cursorX < chartArea.left || cursorX > chartArea.right) return

      const xValue = scales.x.getValueForPixel(cursorX) as number
      const lines  = getLines(xValue)

      // Línea vertical discontinua
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cursorX, chartArea.top)
      ctx.lineTo(cursorX, chartArea.bottom)
      ctx.strokeStyle = 'rgba(80,80,80,0.40)'
      ctx.lineWidth   = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Caja del tooltip
      const pad = 8
      const lh  = 18
      const w   = 170
      const h   = lines.length * lh + pad * 2

      let bx = cursorX + 14
      if (bx + w > chartArea.right) bx = cursorX - w - 14
      const by = chartArea.top + 12

      ctx.fillStyle   = 'rgba(255,255,255,0.93)'
      ctx.strokeStyle = 'rgba(180,180,180,0.7)'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.rect(bx, by, w, h)
      ctx.fill()
      ctx.stroke()

      ctx.textAlign    = 'left'
      ctx.textBaseline = 'middle'
      lines.forEach((line, i) => {
        ctx.font      = i === 0 ? 'bold 11px system-ui,sans-serif' : '11px system-ui,sans-serif'
        ctx.fillStyle = i === 0 ? '#111' : '#444'
        ctx.fillText(line, bx + pad, by + pad + lh * i + lh / 2)
      })

      ctx.restore()
    },
  }
}

// Interpola linealmente el valor de ys en xVal dado el array de xs
export function interpolate(xs: number[], ys: number[], xVal: number): number {
  if (xs.length === 0) return 0
  if (xVal <= xs[0]) return ys[0]
  if (xVal >= xs[xs.length - 1]) return ys[xs.length - 1]
  const i = xs.findIndex(x => x > xVal)
  const t = (xVal - xs[i - 1]) / (xs[i] - xs[i - 1])
  return ys[i - 1] + t * (ys[i] - ys[i - 1])
}
