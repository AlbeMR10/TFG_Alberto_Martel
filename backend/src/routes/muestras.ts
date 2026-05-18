import { Router, Request, Response } from 'express'
import { pool } from '../db'

// Columnas que muestra output$ver_informacion en app.R:
// subset(filemaker, IdMuestra == input$Datacion,
//   c("Yacimiento","Isla","IdMuestra","BP","SD","Higiene",
//     "Contexto_Est","Vida","Material","Especie","Adscripcion","Referencia","Id_BibTeX"))
export interface MuestraRow {
  IdMuestra:    string
  BP:           number
  SD:           number
  Yacimiento:   string
  Isla:         string
  Higiene:      number
  Contexto_Est: string
  Vida:         string
  Material:     string
  Especie:      string
  Adscripcion:  string
  Referencia:   string
  Id_BibTeX:    string
  Lat:          number
  Lon:          number
}

const SELECT_MUESTRA = `
  SELECT
    m.id_muestra_lab  AS IdMuestra,
    m.bp              AS BP,
    m.sd              AS SD,
    y.nombre          AS Yacimiento,
    y.isla            AS Isla,
    m.higiene         AS Higiene,
    m.contexto_est    AS Contexto_Est,
    m.vida            AS Vida,
    m.material        AS Material,
    m.especie         AS Especie,
    m.adscripcion     AS Adscripcion,
    b.referencia      AS Referencia,
    b.id_bibtex       AS Id_BibTeX,
    m.latitud         AS Lat,
    m.longitud        AS Lon
  FROM muestras m
  JOIN yacimientos y ON m.id_yacimiento = y.id
  LEFT JOIN bibliografias b ON m.id_biblio = b.id
`

const router = Router()

// GET /api/muestras — todas las muestras (para el desplegable)
router.get('/', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(SELECT_MUESTRA)
  res.json(rows)
})

// GET /api/muestras/:idMuestra — datos completos de una muestra (para ver_informacion)
router.get('/:idMuestra', async (req: Request, res: Response) => {
  const [rows] = await pool.query(
    `${SELECT_MUESTRA} WHERE m.id_muestra_lab = ?`,
    [req.params.idMuestra]
  ) as [MuestraRow[], unknown]

  if (rows.length === 0) { res.status(404).json({ error: 'No encontrada' }); return }
  res.json(rows[0])
})

export default router
