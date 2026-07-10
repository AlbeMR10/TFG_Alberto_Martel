import { Router, Request, Response } from 'express'
import { pool } from '../db'

const router = Router()

function mensajeError(err: unknown): string {
  const e = err as { code?: string; message?: string }
  if (e.code === 'ER_DUP_ENTRY')              return 'Ya existe un registro con ese identificador (IdMuestra o Id BibTeX duplicado)'
  if (e.code === 'ER_DATA_TOO_LONG')          return 'Un valor introducido es demasiado largo para ese campo'
  if (e.code === 'ER_TRUNCATED_WRONG_VALUE')  return 'Formato de valor incorrecto (comprueba fechas y números)'
  if (e.code === 'ER_BAD_NULL_ERROR')         return 'Falta un campo obligatorio'
  return e.message ?? 'Error interno del servidor'
}

// ── GET /api/admin/muestras ───────────────────────────────────────────────────
// Todas las muestras con todos sus campos para la tabla principal del panel admin.
router.get('/muestras', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(`
    SELECT
      m.id,
      m.id_muestra_lab  AS IdMuestra,
      m.bp              AS BP,
      m.sd              AS SD,
      y.nombre          AS Yacimiento,
      y.isla            AS Isla,
      y.localidad       AS Localidad,
      y.provincia       AS Provincia,
      y.unidad_geografica AS UnidadGeografica,
      m.latitud         AS Lat,
      m.longitud        AS Lon,
      m.vida            AS Vida,
      m.material        AS Material,
      m.tipo            AS Tipo,
      m.cantidad        AS Cantidad,
      m.especie         AS Especie,
      m.carbono_13      AS Carbono_13,
      m.nitrogeno_15    AS Nitrogeno_15,
      m.oxigeno_18      AS Oxigeno_18,
      m.cn              AS CN,
      m.colageno        AS Colageno,
      m.dieta_marina    AS DietaMarina,
      m.efecto_reservorio AS EfectoReservorio,
      m.contexto_domestico  AS CtxDomestico,
      m.contexto_funerario  AS CtxFunerario,
      m.contexto_otro       AS CtxOtro,
      m.contexto_descontext AS CtxDescontext,
      m.tipo_yacimiento AS TipoYacimiento,
      m.contexto_est    AS ContextoEst,
      m.contexto_fun_1  AS ContextoFun1,
      m.contexto_fun_2  AS ContextoFun2,
      m.nivel           AS Nivel,
      m.uuee            AS UUEE,
      m.adscripcion     AS Adscripcion,
      m.autoria_ficha   AS AutoriaFicha,
      m.fecha_introduccion AS FechaIntroduccion,
      m.higiene         AS Higiene,
      b.referencia      AS Referencia,
      b.id_bibtex       AS IdBibTeX,
      m.id_yacimiento,
      m.id_biblio
    FROM muestras m
    JOIN yacimientos y ON m.id_yacimiento = y.id
    LEFT JOIN bibliografias b ON m.id_biblio = b.id
    ORDER BY m.id
  `)
  res.json(rows)
})

// ── GET /api/admin/yacimientos ────────────────────────────────────────────────
// Lista todos los yacimientos para el desplegable del wizard.
router.get('/yacimientos', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    'SELECT id, nombre, localidad, isla, provincia, unidad_geografica FROM yacimientos ORDER BY nombre'
  )
  res.json(rows)
})

// ── GET /api/admin/bibliografias ──────────────────────────────────────────────
// Lista todas las bibliografías para el desplegable del wizard.
router.get('/bibliografias', async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    'SELECT id, id_bibtex, referencia FROM bibliografias ORDER BY referencia'
  )
  res.json(rows)
})

// ── POST /api/admin/bibliografias ─────────────────────────────────────────────
// Crea una nueva bibliografía. Devuelve el registro creado con su id.
router.post('/bibliografias', async (req: Request, res: Response) => {
  const { id_bibtex, referencia } = req.body
  if (!id_bibtex) { res.status(400).json({ error: 'id_bibtex es obligatorio' }); return }
  try {
    const [result] = await pool.execute(
      'INSERT INTO bibliografias (id_bibtex, referencia) VALUES (?, ?)',
      [id_bibtex, referencia ?? null]
    ) as [{ insertId: number }, unknown]
    res.status(201).json({ id: result.insertId, id_bibtex, referencia })
  } catch (err) {
    res.status(400).json({ error: mensajeError(err) })
  }
})

// ── POST /api/admin/yacimientos ───────────────────────────────────────────────
// Crea un nuevo yacimiento. Devuelve el registro creado con su id.
router.post('/yacimientos', async (req: Request, res: Response) => {
  const { nombre, localidad, isla, provincia, unidad_geografica } = req.body
  if (!nombre) { res.status(400).json({ error: 'nombre es obligatorio' }); return }
  try {
    const [result] = await pool.execute(
      'INSERT INTO yacimientos (nombre, localidad, isla, provincia, unidad_geografica) VALUES (?, ?, ?, ?, ?)',
      [nombre, localidad ?? null, isla ?? null, provincia ?? null, unidad_geografica ?? null]
    ) as [{ insertId: number }, unknown]
    res.status(201).json({ id: result.insertId, nombre, localidad, isla, provincia, unidad_geografica })
  } catch (err) {
    res.status(400).json({ error: mensajeError(err) })
  }
})

// ── POST /api/admin/muestras/completa ────────────────────────────────────────
// Crea bibliografía + yacimiento + muestra en una sola transacción.
// Si cualquier paso falla, se hace rollback de todo.
router.post('/muestras/completa', async (req: Request, res: Response) => {
  const { biblio, yacimiento, ...muestra } = req.body
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Resolver bibliografía
    let id_biblio: number | null = null
    if (biblio?.tipo === 'existente') {
      id_biblio = biblio.id
    } else if (biblio?.tipo === 'nueva') {
      const [r] = await conn.execute(
        'INSERT INTO bibliografias (id_bibtex, referencia) VALUES (?, ?)',
        [biblio.id_bibtex, biblio.referencia ?? null]
      ) as [{ insertId: number }, unknown]
      id_biblio = r.insertId
    }

    // Resolver yacimiento
    let id_yacimiento: number
    if (yacimiento?.tipo === 'existente') {
      id_yacimiento = yacimiento.id
    } else {
      const [r] = await conn.execute(
        'INSERT INTO yacimientos (nombre, localidad, isla, provincia, unidad_geografica) VALUES (?, ?, ?, ?, ?)',
        [yacimiento.nombre, yacimiento.localidad ?? null, yacimiento.isla ?? null, yacimiento.provincia ?? null, yacimiento.unidad_geografica ?? null]
      ) as [{ insertId: number }, unknown]
      id_yacimiento = r.insertId
    }

    // Insertar muestra
    const [r] = await conn.execute(
      `INSERT INTO muestras (
        id_yacimiento, id_biblio, id_muestra_lab, bp, sd, latitud, longitud,
        vida, material, tipo, cantidad, especie,
        carbono_13, nitrogeno_15, oxigeno_18, cn, colageno,
        dieta_marina, efecto_reservorio,
        contexto_domestico, contexto_funerario, contexto_otro, contexto_descontext,
        tipo_yacimiento, contexto_est, contexto_fun_1, contexto_fun_2,
        nivel, uuee, adscripcion, autoria_ficha, fecha_introduccion, higiene
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id_yacimiento, id_biblio, muestra.id_muestra_lab, muestra.bp, muestra.sd,
        muestra.latitud ?? null, muestra.longitud ?? null,
        muestra.vida ?? null, muestra.material ?? null, muestra.tipo ?? null,
        muestra.cantidad ?? null, muestra.especie ?? null,
        muestra.carbono_13 ?? null, muestra.nitrogeno_15 ?? null, muestra.oxigeno_18 ?? null,
        muestra.cn ?? null, muestra.colageno ?? null,
        muestra.dieta_marina ?? null, muestra.efecto_reservorio ?? null,
        muestra.contexto_domestico ? 1 : 0, muestra.contexto_funerario ? 1 : 0,
        muestra.contexto_otro ? 1 : 0, muestra.contexto_descontext ? 1 : 0,
        muestra.tipo_yacimiento ?? null, muestra.contexto_est ?? null,
        muestra.contexto_fun_1 ?? null, muestra.contexto_fun_2 ?? null,
        muestra.nivel ?? null, muestra.uuee ?? null, muestra.adscripcion ?? null,
        muestra.autoria_ficha ?? null, muestra.fecha_introduccion ?? null, muestra.higiene ?? null,
      ]
    ) as [{ insertId: number }, unknown]

    await conn.commit()
    res.status(201).json({ id: (r as { insertId: number }).insertId })
  } catch (err) {
    await conn.rollback()
    res.status(400).json({ error: mensajeError(err) })
  } finally {
    conn.release()
  }
})

// ── PUT /api/admin/muestras/:id/completa ──────────────────────────────────────
// Edita muestra en transacción. Si se crea bibliografía o yacimiento nuevo y
// la muestra falla, el rollback deshace también esas inserciones.
router.put('/muestras/:id/completa', async (req: Request, res: Response) => {
  const { id } = req.params
  const { biblio, yacimiento, ...muestra } = req.body
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    let id_biblio: number | null = null
    if (biblio?.tipo === 'existente') {
      id_biblio = biblio.id
    } else if (biblio?.tipo === 'nueva') {
      const [r] = await conn.execute(
        'INSERT INTO bibliografias (id_bibtex, referencia) VALUES (?, ?)',
        [biblio.id_bibtex, biblio.referencia ?? null]
      ) as [{ insertId: number }, unknown]
      id_biblio = r.insertId
    }

    let id_yacimiento: number
    if (yacimiento?.tipo === 'existente') {
      id_yacimiento = yacimiento.id
    } else {
      const [r] = await conn.execute(
        'INSERT INTO yacimientos (nombre, localidad, isla, provincia, unidad_geografica) VALUES (?, ?, ?, ?, ?)',
        [yacimiento.nombre, yacimiento.localidad ?? null, yacimiento.isla ?? null, yacimiento.provincia ?? null, yacimiento.unidad_geografica ?? null]
      ) as [{ insertId: number }, unknown]
      id_yacimiento = r.insertId
    }

    await conn.execute(
      `UPDATE muestras SET
        id_yacimiento=?, id_biblio=?, id_muestra_lab=?, bp=?, sd=?, latitud=?, longitud=?,
        vida=?, material=?, tipo=?, cantidad=?, especie=?,
        carbono_13=?, nitrogeno_15=?, oxigeno_18=?, cn=?, colageno=?,
        dieta_marina=?, efecto_reservorio=?,
        contexto_domestico=?, contexto_funerario=?, contexto_otro=?, contexto_descontext=?,
        tipo_yacimiento=?, contexto_est=?, contexto_fun_1=?, contexto_fun_2=?,
        nivel=?, uuee=?, adscripcion=?, autoria_ficha=?, fecha_introduccion=?, higiene=?
      WHERE id=?`,
      [
        id_yacimiento, id_biblio, muestra.id_muestra_lab, muestra.bp, muestra.sd,
        muestra.latitud ?? null, muestra.longitud ?? null,
        muestra.vida ?? null, muestra.material ?? null, muestra.tipo ?? null,
        muestra.cantidad ?? null, muestra.especie ?? null,
        muestra.carbono_13 ?? null, muestra.nitrogeno_15 ?? null, muestra.oxigeno_18 ?? null,
        muestra.cn ?? null, muestra.colageno ?? null,
        muestra.dieta_marina ?? null, muestra.efecto_reservorio ?? null,
        muestra.contexto_domestico ? 1 : 0, muestra.contexto_funerario ? 1 : 0,
        muestra.contexto_otro ? 1 : 0, muestra.contexto_descontext ? 1 : 0,
        muestra.tipo_yacimiento ?? null, muestra.contexto_est ?? null,
        muestra.contexto_fun_1 ?? null, muestra.contexto_fun_2 ?? null,
        muestra.nivel ?? null, muestra.uuee ?? null, muestra.adscripcion ?? null,
        muestra.autoria_ficha ?? null, muestra.fecha_introduccion ?? null, muestra.higiene ?? null,
        id,
      ]
    )

    await conn.commit()
    res.json({ ok: true })
  } catch (err) {
    await conn.rollback()
    res.status(400).json({ error: mensajeError(err) })
  } finally {
    conn.release()
  }
})

// ── POST /api/admin/muestras ──────────────────────────────────────────────────
// Crea una nueva muestra. Recibe id_yacimiento e id_biblio ya resueltos por el wizard.
router.post('/muestras', async (req: Request, res: Response) => {
  const {
    id_yacimiento, id_biblio, id_muestra_lab, bp, sd, latitud, longitud,
    vida, material, tipo, cantidad, especie,
    carbono_13, nitrogeno_15, oxigeno_18, cn, colageno,
    dieta_marina, efecto_reservorio,
    contexto_domestico, contexto_funerario, contexto_otro, contexto_descontext,
    tipo_yacimiento, contexto_est, contexto_fun_1, contexto_fun_2,
    nivel, uuee, adscripcion, autoria_ficha, fecha_introduccion, higiene,
  } = req.body

  if (!id_yacimiento || !id_muestra_lab || !bp || !sd) {
    res.status(400).json({ error: 'id_yacimiento, id_muestra_lab, bp y sd son obligatorios' })
    return
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO muestras (
        id_yacimiento, id_biblio, id_muestra_lab, bp, sd, latitud, longitud,
        vida, material, tipo, cantidad, especie,
        carbono_13, nitrogeno_15, oxigeno_18, cn, colageno,
        dieta_marina, efecto_reservorio,
        contexto_domestico, contexto_funerario, contexto_otro, contexto_descontext,
        tipo_yacimiento, contexto_est, contexto_fun_1, contexto_fun_2,
        nivel, uuee, adscripcion, autoria_ficha, fecha_introduccion, higiene
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id_yacimiento, id_biblio ?? null, id_muestra_lab, bp, sd, latitud ?? null, longitud ?? null,
        vida ?? null, material ?? null, tipo ?? null, cantidad ?? null, especie ?? null,
        carbono_13 ?? null, nitrogeno_15 ?? null, oxigeno_18 ?? null, cn ?? null, colageno ?? null,
        dieta_marina ?? null, efecto_reservorio ?? null,
        contexto_domestico ? 1 : 0, contexto_funerario ? 1 : 0, contexto_otro ? 1 : 0, contexto_descontext ? 1 : 0,
        tipo_yacimiento ?? null, contexto_est ?? null, contexto_fun_1 ?? null, contexto_fun_2 ?? null,
        nivel ?? null, uuee ?? null, adscripcion ?? null, autoria_ficha ?? null,
        fecha_introduccion ?? null, higiene ?? null,
      ]
    ) as [{ insertId: number }, unknown]
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    res.status(400).json({ error: mensajeError(err) })
  }
})

// ── PUT /api/admin/muestras/:id ───────────────────────────────────────────────
// Edita una muestra existente.
router.put('/muestras/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const {
    id_yacimiento, id_biblio, id_muestra_lab, bp, sd, latitud, longitud,
    vida, material, tipo, cantidad, especie,
    carbono_13, nitrogeno_15, oxigeno_18, cn, colageno,
    dieta_marina, efecto_reservorio,
    contexto_domestico, contexto_funerario, contexto_otro, contexto_descontext,
    tipo_yacimiento, contexto_est, contexto_fun_1, contexto_fun_2,
    nivel, uuee, adscripcion, autoria_ficha, fecha_introduccion, higiene,
  } = req.body

  try {
    await pool.execute(
      `UPDATE muestras SET
        id_yacimiento=?, id_biblio=?, id_muestra_lab=?, bp=?, sd=?, latitud=?, longitud=?,
        vida=?, material=?, tipo=?, cantidad=?, especie=?,
        carbono_13=?, nitrogeno_15=?, oxigeno_18=?, cn=?, colageno=?,
        dieta_marina=?, efecto_reservorio=?,
        contexto_domestico=?, contexto_funerario=?, contexto_otro=?, contexto_descontext=?,
        tipo_yacimiento=?, contexto_est=?, contexto_fun_1=?, contexto_fun_2=?,
        nivel=?, uuee=?, adscripcion=?, autoria_ficha=?, fecha_introduccion=?, higiene=?
      WHERE id=?`,
      [
        id_yacimiento, id_biblio ?? null, id_muestra_lab, bp, sd, latitud ?? null, longitud ?? null,
        vida ?? null, material ?? null, tipo ?? null, cantidad ?? null, especie ?? null,
        carbono_13 ?? null, nitrogeno_15 ?? null, oxigeno_18 ?? null, cn ?? null, colageno ?? null,
        dieta_marina ?? null, efecto_reservorio ?? null,
        contexto_domestico ? 1 : 0, contexto_funerario ? 1 : 0, contexto_otro ? 1 : 0, contexto_descontext ? 1 : 0,
        tipo_yacimiento ?? null, contexto_est ?? null, contexto_fun_1 ?? null, contexto_fun_2 ?? null,
        nivel ?? null, uuee ?? null, adscripcion ?? null, autoria_ficha ?? null,
        fecha_introduccion ?? null, higiene ?? null,
        id,
      ]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: mensajeError(err) })
  }
})

// ── DELETE /api/admin/muestras/:id ────────────────────────────────────────────
// Elimina una muestra y limpia yacimiento y bibliografía si quedan huérfanos.
router.delete('/muestras/:id', async (req: Request, res: Response) => {
  const { id } = req.params

  // Guardar las FKs antes de borrar para poder comprobar huérfanos después
  const [muestras] = await pool.query(
    'SELECT id_yacimiento, id_biblio FROM muestras WHERE id = ?', [id]
  ) as [{ id_yacimiento: number; id_biblio: number | null }[], unknown]

  if (muestras.length === 0) { res.status(404).json({ error: 'Muestra no encontrada' }); return }

  const { id_yacimiento, id_biblio } = muestras[0]

  await pool.execute('DELETE FROM muestras WHERE id = ?', [id])

  const deleted: string[] = ['muestra']

  // Comprobar si el yacimiento quedó huérfano
  const [yacRows] = await pool.query(
    'SELECT COUNT(*) AS count FROM muestras WHERE id_yacimiento = ?', [id_yacimiento]
  ) as [{ count: number }[], unknown]
  if (yacRows[0].count === 0) {
    const [yac] = await pool.query('SELECT nombre FROM yacimientos WHERE id = ?', [id_yacimiento]) as [{ nombre: string }[], unknown]
    await pool.execute('DELETE FROM yacimientos WHERE id = ?', [id_yacimiento])
    deleted.push(`yacimiento "${yac[0]?.nombre}"`)
  }

  // Comprobar si la bibliografía quedó huérfana
  if (id_biblio !== null) {
    const [bibRows] = await pool.query(
      'SELECT COUNT(*) AS count FROM muestras WHERE id_biblio = ?', [id_biblio]
    ) as [{ count: number }[], unknown]
    if (bibRows[0].count === 0) {
      const [bib] = await pool.query('SELECT referencia FROM bibliografias WHERE id = ?', [id_biblio]) as [{ referencia: string }[], unknown]
      await pool.execute('DELETE FROM bibliografias WHERE id = ?', [id_biblio])
      deleted.push(`bibliografía "${bib[0]?.referencia}"`)
    }
  }

  res.json({ ok: true, deleted })
})

export default router
