import { WebR } from 'webr'

let instance: WebR | null = null

// Funcion que arranca WebR e instala rcarbon en el servidor Node.js.
// Se llama UNA vez al arrancar el servidor (en src/index.ts).
export async function initWebR(): Promise<void> {
  if (instance) return   //  Si ya estaba inicializado, no hacer nada

  console.log('[WebR] Iniciando motor R...')
  const webR = new WebR()
  await webR.init()

  console.log('[WebR] Instalando rcarbon...')
  await webR.installPackages(['rcarbon'], { quiet: true })

  instance = webR
  console.log('[WebR] Listo.')
}

// Funcion que devuelve la instancia de WebR ya inicializada.
export function getWebR(): WebR {
  if (!instance) {
    throw new Error('WebR no está inicializado. Llama a initWebR() primero.')
  }
  return instance
}

// runR() es un helper que ejecuta un bloque de código R y extrae
// un vector numérico del entorno R por su nombre de variable.
// Así los servicios no tienen que repetir siempre la misma lógica de extracción.
export async function runR(code: string): Promise<void> {
  await getWebR().evalR(code)
}

export async function getRVector(varName: string): Promise<number[]> {
  const obj = await getWebR().evalR(`as.numeric(${varName})`)
  const js  = await obj.toJs() as { values: (number | null)[] }
  return js.values.filter((v): v is number => v !== null)
}
