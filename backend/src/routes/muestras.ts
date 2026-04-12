import { Router, Request, Response } from 'express'
import * as fs   from 'fs'
import * as path from 'path'

// Columnas que muestra output$ver_informacion en app.R:
// subset(filemaker, IdMuestra == input$Datacion,
//   c("Yacimiento","Isla","IdMuestra","BP","SD","Higiene",
//     "Contexto_Est","Vida","Material","Especie","Adscripcion","Referencia","Id_BibTeX"))
export interface MuestraRow {
  IdMuestra:   string
  BP:          number
  SD:          number
  Yacimiento:  string
  Isla:        string
  Higiene:     string
  Contexto_Est: string
  Vida:        string
  Material:    string
  Especie:     string
  Adscripcion: string
  Referencia:  string
  Id_BibTeX:   string
}

function loadCsv(): MuestraRow[] {
  const csvPath = path.resolve(__dirname, '../../../database/Canarias.csv')
  const text    = fs.readFileSync(csvPath, 'utf-8')
  const lines   = text.trim().split('\n')
  const headers = lines[0].split(';').map(h => h.trim())

  const col = (name: string) => headers.indexOf(name)

  const rows: MuestraRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(';')
    const id = c[col('IdMuestra')]?.trim()
    const bp = Number(c[col('BP')])
    const sd = Number(c[col('SD')])
    if (!id || isNaN(bp) || isNaN(sd)) continue
    rows.push({
      IdMuestra:    id,
      BP:           bp,
      SD:           sd,
      Yacimiento:   c[col('Yacimiento')]?.trim()   ?? '',
      Isla:         c[col('Isla')]?.trim()          ?? '',
      Higiene:      c[col('Higiene')]?.trim()       ?? '',
      Contexto_Est: c[col('Contexto_Est')]?.trim()  ?? '',
      Vida:         c[col('Vida')]?.trim()          ?? '',
      Material:     c[col('Material')]?.trim()      ?? '',
      Especie:      c[col('Especie')]?.trim()       ?? '',
      Adscripcion:  c[col('Adscripcion')]?.trim()   ?? '',
      Referencia:   c[col('Referencia')]?.trim()    ?? '',
      Id_BibTeX:    c[col('Id_BibTeX')]?.trim()     ?? '',
    })
  }
  return rows
}

const muestras = loadCsv()

const router = Router()

// GET /api/muestras — todas las muestras (para el desplegable)
router.get('/', (_req: Request, res: Response) => {
  res.json(muestras)
})

// GET /api/muestras/:idMuestra — datos completos de una muestra (para ver_informacion)
router.get('/:idMuestra', (req: Request, res: Response) => {
  const muestra = muestras.find(m => m.IdMuestra === req.params.idMuestra)
  if (!muestra) { res.status(404).json({ error: 'No encontrada' }); return }
  res.json(muestra)
})

export default router
