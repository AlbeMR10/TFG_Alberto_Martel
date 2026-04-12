import { WebR } from 'webr'
import * as fs   from 'fs'
import * as path from 'path'

let instance: WebR | null = null

// Ruta a las curvas de calibracion en el proyecto
// backend/src/services/ → subir 3 niveles → raiz del proyecto → database/curves/
const CURVES_DIR = path.resolve(__dirname, '../../../database/curves')
const CURVE_NAMES = ['intcal20', 'intcal13', 'marine20', 'marine13']

export async function initWebR(): Promise<void> {
  if (instance) return

  console.log('[WebR] Iniciando motor R...')
  const webR = new WebR()
  await webR.init()

  console.log('[WebR] Instalando rcarbon...')
  await webR.installPackages(['rcarbon'], { quiet: true })

  // Subir los archivos .14c al sistema de archivos virtual de WebR.
  // WebR corre en WASM y tiene su propio filesystem aislado — no puede
  // leer archivos del disco del host directamente. Con FS.writeFile()
  // copiamos las curvas al directorio /home/web_user/ dentro de WASM,
  // donde el codigo R las puede leer con read.table() normalmente.
  console.log('[WebR] Cargando curvas de calibracion...')
  for (const curveName of CURVE_NAMES) {
    const filePath = path.join(CURVES_DIR, `${curveName}.14c`)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath)
      await webR.FS.writeFile(`/home/web_user/${curveName}.14c`, data)
    }
  }

  instance = webR
  console.log('[WebR] Listo.')
}

export function getWebR(): WebR {
  if (!instance) {
    throw new Error('WebR no está inicializado. Llama a initWebR() primero.')
  }
  return instance
}

export async function runR(code: string): Promise<void> {
  await getWebR().evalR(code)
}

export async function getRVector(varName: string): Promise<number[]> {
  const obj = await getWebR().evalR(`as.numeric(${varName})`)
  const js  = await obj.toJs() as { values: (number | null)[] }
  return js.values.filter((v): v is number => v !== null)
}
