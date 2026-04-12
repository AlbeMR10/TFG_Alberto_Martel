import express from 'express'
import * as path from 'path'
import { initWebR } from './services/webr'
import calibrationRouter from './routes/calibration'
import muestrasRouter    from './routes/muestras'
import spdRouter         from './routes/spd'

const PORT = process.env.PORT ?? 3001

async function main() {
  // ── 1. Inicializar WebR ───────────────────────────────────────────────────
  // Arranca el motor R (WASM) e instala rcarbon.
  // Tarda ~30 segundos la primera vez. Hasta que no termine, el servidor
  // no empieza a escuchar — así ninguna petición llega antes de que R esté listo.
  await initWebR()

  // ── 2. Crear la aplicación Express ───────────────────────────────────────
  const app = express()

  // Parsear cuerpos JSON en las peticiones POST/PUT
  // (la calibración usa GET, pero lo dejamos para futuras rutas)
  app.use(express.json())

  // CORS: permite que el frontend (React en localhost:5173) llame al backend
  // (localhost:3001) sin que el navegador lo bloquee.
  // En producción se restringiría al dominio real.
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    next()
  })

  // ── 3. Servir archivos estáticos ─────────────────────────────────────────
  // La página de prueba (test.html) se sirve desde backend/test/
  app.use(express.static(path.join(__dirname, '../test')))

  // ── 4. Montar las rutas ───────────────────────────────────────────────────
  app.use('/api/calibrate', calibrationRouter)
  app.use('/api/muestras',  muestrasRouter)
  app.use('/api/spd',       spdRouter)

  // Ruta de comprobación — útil para saber si el servidor está vivo
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // ── 4. Arrancar el servidor ───────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${PORT}`)
  })
}

main().catch(err => {
  console.error('[server] Error fatal al arrancar:', err)
  process.exit(1)
})
