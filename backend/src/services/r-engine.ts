import { execFile } from 'child_process'
import * as os       from 'os'
import * as fs       from 'fs/promises'
import * as path     from 'path'

// ── r-engine.ts ───────────────────────────────────────────────────────────────
//
// Adapter que ejecuta código R y devuelve el resultado como objeto JS.
//
// Uso:
//   const result = await runRCode(`
//     library(rcarbon)
//     .cal <- calibrate(800, 30)
//     list(bcad = as.numeric(1950 - .cal$grids[[1]]$calBP))
//   `)
//   // result.bcad → number[]
//
// El código R debe terminar con una expresión list() o un objeto R que
// jsonlite::toJSON() pueda serializar. El engine añade automáticamente
// la llamada a toJSON() y cat() al final.
//
// Motor actual: Rscript (subproceso nativo).
// Motor futuro: Plumber (HTTP). Para cambiarlo, solo se modifica este fichero.
// El resto del código (calibration.ts, spd.ts, etc.) no cambia.
//
// Variable de entorno:
//   R_ENGINE=rscript   (default)
//   R_ENGINE=plumber   (futuro — lanza fetch a http://localhost:8001)

const ENGINE = (process.env.R_ENGINE ?? 'rscript') as 'rscript' | 'plumber'

// ── runRCode ──────────────────────────────────────────────────────────────────
//
// Ejecuta `rCode` en R y devuelve el resultado como objeto JS.
// El código R debe terminar con una expresión list(...) — el engine
// añade la serialización JSON automáticamente.
//
export async function runRCode(rCode: string): Promise<Record<string, any>> {
  if (ENGINE === 'plumber') {
    return runViaPlumber(rCode)
  }
  return runViaRscript(rCode)
}

// ── Motor Rscript ─────────────────────────────────────────────────────────────

async function runViaRscript(rCode: string): Promise<Record<string, any>> {
  const id         = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const scriptPath = path.join(os.tmpdir(), `r_engine_${id}.R`)

  // Redirigimos stdout a /dev/null durante el cálculo para que ningún
  // mensaje de R (barras de progreso, warnings, etc.) contamine el JSON.
  // Solo el cat() final llega a stdout y TypeScript lo parsea.
  const fullScript = `
suppressPackageStartupMessages(library(jsonlite))
.null_con <- file("/dev/null", open = "wt")
sink(.null_con)
.result <- local({
${rCode}
})
sink()
close(.null_con)
cat(jsonlite::toJSON(.result, auto_unbox = TRUE, digits = 10))
`

  await fs.writeFile(scriptPath, fullScript, 'utf-8')

  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        'Rscript', ['--no-save', '--no-restore', scriptPath],
        { timeout: 120_000 },  // 2 min para calibración/SPD normales
        (err, out, stderr) => {
          if (err) reject(new Error(stderr || err.message))
          else resolve(out)
        }
      )
    })
    return JSON.parse(stdout)
  } finally {
    await fs.unlink(scriptPath).catch(() => {})
  }
}

// ── Motor Plumber (futuro) ────────────────────────────────────────────────────
// Cuando tengas Plumber corriendo, activa R_ENGINE=plumber.
// El servidor Plumber expone POST /run que acepta { code: string }
// y devuelve el JSON resultante. No hay que tocar los servicios.

async function runViaPlumber(rCode: string): Promise<Record<string, any>> {
  const PLUMBER_URL = process.env.PLUMBER_URL ?? 'http://localhost:8001'
  const res = await fetch(`${PLUMBER_URL}/run`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ code: rCode }),
  })
  if (!res.ok) throw new Error(`Plumber error: ${res.status} ${await res.text()}`)
  return res.json() as Promise<Record<string, any>>
}
