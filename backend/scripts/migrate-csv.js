const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');
const path = require('path');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME     || '14Canarias',
};

const CSV_PATH = path.join(__dirname, '../../database/Canarias.csv');

function parseFloat2(v) { return v && v.trim() !== '' ? parseFloat(v) : null; }
function parseInt2(v)   { return v && v.trim() !== '' ? parseInt(v)   : null; }
function parseBool(v)   { return v && v.trim() === 'Si' ? 1 : 0; }
function str(v)         { return v && v.trim() !== '' ? v.trim() : null; }

function parseDate(v) {
  if (!v || v.trim() === '') return null;
  const parts = v.trim().split('/');
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
}

async function migrate() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('Conectado a MySQL.');

  const yacimientosCache   = new Map();
  const bibliografiasCache = new Map();

  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let lineNum  = 0;
  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) continue; // cabecera

    const cols = line.split(';');
    if (cols.length < 38) { skipped++; continue; }

    const [
      yacimiento, localidad, isla, provincia, unidadGeo,
      lat, lng, bp, sd, idMuestra, vida, material, tipo, cantidad, especie,
      carbono13, nitrogeno15, oxigeno18, cn, colageno,
      dietaMarina, efectoReservorio,
      ctxDomestico, ctxFunerario, ctxOtro, ctxDescontext,
      tipoYacimiento, contextoEst, contextoFun1, contextoFun2,
      nivel, uuee, adscripcion, autoriaFicha, fechaIntro, higiene,
      referencia, idBibtex
    ] = cols;

    try {
      // 1. bibliografias
      let idBiblio = null;
      const bibtexKey = str(idBibtex);
      if (bibtexKey) {
        if (bibliografiasCache.has(bibtexKey)) {
          idBiblio = bibliografiasCache.get(bibtexKey);
        } else {
          await conn.execute(
            'INSERT IGNORE INTO bibliografias (id_bibtex, referencia) VALUES (?, ?)',
            [bibtexKey, str(referencia)]
          );
          const [rows] = await conn.execute(
            'SELECT id FROM bibliografias WHERE id_bibtex = ?', [bibtexKey]
          );
          idBiblio = rows[0].id;
          bibliografiasCache.set(bibtexKey, idBiblio);
        }
      }

      // 2. yacimientos
      let idYacimiento = null;
      const nombreYac = str(yacimiento);
      if (yacimientosCache.has(nombreYac)) {
        idYacimiento = yacimientosCache.get(nombreYac);
      } else {
        const [existing] = await conn.execute(
          'SELECT id FROM yacimientos WHERE nombre = ?', [nombreYac]
        );
        if (existing.length > 0) {
          idYacimiento = existing[0].id;
        } else {
          const [result] = await conn.execute(
            'INSERT INTO yacimientos (nombre, localidad, isla, provincia, unidad_geografica) VALUES (?, ?, ?, ?, ?)',
            [nombreYac, str(localidad), str(isla), str(provincia), str(unidadGeo)]
          );
          idYacimiento = result.insertId;
        }
        yacimientosCache.set(nombreYac, idYacimiento);
      }

      // 3. muestras
      await conn.execute(
        `INSERT IGNORE INTO muestras (
          id_yacimiento, id_biblio, id_muestra_lab, bp, sd, latitud, longitud,
          vida, material, tipo, cantidad, especie,
          carbono_13, nitrogeno_15, oxigeno_18, cn, colageno,
          dieta_marina, efecto_reservorio,
          contexto_domestico, contexto_funerario, contexto_otro, contexto_descontext,
          tipo_yacimiento, contexto_est, contexto_fun_1, contexto_fun_2,
          nivel, uuee, adscripcion, autoria_ficha, fecha_introduccion, higiene
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idYacimiento, idBiblio, str(idMuestra),
          parseInt2(bp), parseInt2(sd),
          parseFloat2(lat), parseFloat2(lng),
          str(vida), str(material), str(tipo), str(cantidad), str(especie),
          parseFloat2(carbono13), parseFloat2(nitrogeno15), parseFloat2(oxigeno18),
          parseFloat2(cn), parseFloat2(colageno),
          str(dietaMarina), str(efectoReservorio),
          parseBool(ctxDomestico), parseBool(ctxFunerario), parseBool(ctxOtro), parseBool(ctxDescontext),
          str(tipoYacimiento), str(contextoEst), str(contextoFun1), str(contextoFun2),
          str(nivel), str(uuee), str(adscripcion), str(autoriaFicha),
          parseDate(fechaIntro), parseInt2(higiene),
        ]
      );
      inserted++;

    } catch (err) {
      console.error(`Error en línea ${lineNum}: ${err.message}`);
      errors++;
    }
  }

  await conn.end();
  console.log(`\nMigración completada:`);
  console.log(`  ${inserted} muestras insertadas`);
  console.log(`  ${skipped}  filas saltadas (columnas insuficientes)`);
  console.log(`  ${errors}   errores`);
  console.log(`  ${bibliografiasCache.size} referencias únicas`);
  console.log(`  ${yacimientosCache.size}  yacimientos únicos`);
}

migrate().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
