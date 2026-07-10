import { useState } from 'react'
import type { Muestra } from '../../types'

interface Props {
  inicial: Partial<Muestra> | null
  onAnterior: () => void
  onGuardar: (datos: object) => Promise<void>
}

type FormData = {
  id_muestra_lab: string
  bp: string
  sd: string
  latitud: string
  longitud: string
  vida: string
  material: string
  tipo: string
  cantidad: string
  especie: string
  carbono_13: string
  nitrogeno_15: string
  oxigeno_18: string
  cn: string
  colageno: string
  dieta_marina: string
  efecto_reservorio: string
  contexto_domestico: boolean
  contexto_funerario: boolean
  contexto_otro: boolean
  contexto_descontext: boolean
  tipo_yacimiento: string
  contexto_est: string
  contexto_fun_1: string
  contexto_fun_2: string
  nivel: string
  uuee: string
  adscripcion: string
  autoria_ficha: string
  fecha_introduccion: string
  higiene: string
}

function toForm(m: Partial<Muestra> | null): FormData {
  return {
    id_muestra_lab:     m?.IdMuestra        ?? '',
    bp:                 m?.BP != null        ? String(m.BP)  : '',
    sd:                 m?.SD != null        ? String(m.SD)  : '',
    latitud:            m?.Lat != null       ? String(m.Lat) : '',
    longitud:           m?.Lon != null       ? String(m.Lon) : '',
    vida:               m?.Vida             ?? '',
    material:           m?.Material         ?? '',
    tipo:               m?.Tipo             ?? '',
    cantidad:           m?.Cantidad         ?? '',
    especie:            m?.Especie          ?? '',
    carbono_13:         m?.Carbono_13 != null ? String(m.Carbono_13)  : '',
    nitrogeno_15:       m?.Nitrogeno_15 != null ? String(m.Nitrogeno_15) : '',
    oxigeno_18:         m?.Oxigeno_18 != null ? String(m.Oxigeno_18) : '',
    cn:                 m?.CN != null        ? String(m.CN)  : '',
    colageno:           m?.Colageno != null  ? String(m.Colageno) : '',
    dieta_marina:       m?.DietaMarina      ?? '',
    efecto_reservorio:  m?.EfectoReservorio ?? '',
    contexto_domestico: m?.CtxDomestico     ?? false,
    contexto_funerario: m?.CtxFunerario     ?? false,
    contexto_otro:      m?.CtxOtro          ?? false,
    contexto_descontext: m?.CtxDescontext   ?? false,
    tipo_yacimiento:    m?.TipoYacimiento   ?? '',
    contexto_est:       m?.ContextoEst      ?? '',
    contexto_fun_1:     m?.ContextoFun1     ?? '',
    contexto_fun_2:     m?.ContextoFun2     ?? '',
    nivel:              m?.Nivel            ?? '',
    uuee:               m?.UUEE             ?? '',
    adscripcion:        m?.Adscripcion      ?? '',
    autoria_ficha:      m?.AutoriaFicha     ?? '',
    fecha_introduccion: m?.FechaIntroduccion?.slice(0, 10) ?? '',
    higiene:            m?.Higiene != null   ? String(m.Higiene) : '',
  }
}

export default function Paso3Muestra({ inicial, onAnterior, onGuardar }: Props) {
  const [form, setForm] = useState<FormData>(toForm(inicial))
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const setStr = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const setBool = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.checked }))

  const handleGuardar = async () => {
    setError(null)
    if (!form.id_muestra_lab.trim()) { setError('El IdMuestra es obligatorio'); return }
    if (!form.bp || !form.sd) { setError('BP y SD son obligatorios'); return }

    setGuardando(true)
    try {
      await onGuardar({
        id_muestra_lab:      form.id_muestra_lab.trim(),
        bp:                  Number(form.bp),
        sd:                  Number(form.sd),
        latitud:             form.latitud   ? Number(form.latitud)   : null,
        longitud:            form.longitud  ? Number(form.longitud)  : null,
        vida:                form.vida      || null,
        material:            form.material  || null,
        tipo:                form.tipo      || null,
        cantidad:            form.cantidad  || null,
        especie:             form.especie   || null,
        carbono_13:          form.carbono_13   ? Number(form.carbono_13)   : null,
        nitrogeno_15:        form.nitrogeno_15 ? Number(form.nitrogeno_15) : null,
        oxigeno_18:          form.oxigeno_18   ? Number(form.oxigeno_18)   : null,
        cn:                  form.cn           ? Number(form.cn)           : null,
        colageno:            form.colageno     ? Number(form.colageno)     : null,
        dieta_marina:        form.dieta_marina        || null,
        efecto_reservorio:   form.efecto_reservorio   || null,
        contexto_domestico:  form.contexto_domestico,
        contexto_funerario:  form.contexto_funerario,
        contexto_otro:       form.contexto_otro,
        contexto_descontext: form.contexto_descontext,
        tipo_yacimiento:     form.tipo_yacimiento  || null,
        contexto_est:        form.contexto_est     || null,
        contexto_fun_1:      form.contexto_fun_1   || null,
        contexto_fun_2:      form.contexto_fun_2   || null,
        nivel:               form.nivel            || null,
        uuee:                form.uuee             || null,
        adscripcion:         form.adscripcion      || null,
        autoria_ficha:       form.autoria_ficha    || null,
        fecha_introduccion:  form.fecha_introduccion || null,
        higiene:             form.higiene ? Number(form.higiene) : null,
      })
    } catch {
      setError('Error al guardar. Comprueba que el IdMuestra no esté duplicado.')
      setGuardando(false)
    }
  }

  const campo = (label: string, k: keyof FormData, req = false, type = 'text') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {label} {req && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={form[k] as string}
        onChange={setStr(k)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )

  const selector = (label: string, k: keyof FormData, opciones: string[]) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={form[k] as string}
        onChange={setStr(k)}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="">— Sin especificar —</option>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  const check = (label: string, k: keyof FormData) => (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input
        type="checkbox"
        checked={form[k] as boolean}
        onChange={setBool(k)}
        className="rounded"
      />
      {label}
    </label>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Paso 3 — Datos de la muestra</h2>

      {/* Identificación */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificación</h3>
        <div className="grid grid-cols-4 gap-3">
          {campo('IdMuestra', 'id_muestra_lab', true)}
          {campo('BP', 'bp', true, 'number')}
          {campo('SD', 'sd', true, 'number')}
          {campo('Higiene', 'higiene', false, 'number')}
        </div>
      </section>

      {/* Coordenadas */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Coordenadas</h3>
        <div className="grid grid-cols-2 gap-3">
          {campo('Latitud', 'latitud', false, 'number')}
          {campo('Longitud', 'longitud', false, 'number')}
        </div>
      </section>

      {/* Muestra */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Muestra</h3>
        <div className="grid grid-cols-3 gap-3">
          {selector('Vida', 'vida', ['Corta', 'Larga'])}
          {selector('Tipo', 'tipo', ['AMS', 'Conv.'])}
          {selector('Cantidad', 'cantidad', ['Singular', 'Agregado'])}
          {campo('Material', 'material')}
          {campo('Especie', 'especie')}
          {selector('Adscripción', 'adscripcion', ['Aborigen', 'Colonial'])}
        </div>
      </section>

      {/* Isótopos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Isótopos (opcional)</h3>
        <div className="grid grid-cols-5 gap-3">
          {campo('Carbono 13', 'carbono_13', false, 'number')}
          {campo('Nitrógeno 15', 'nitrogeno_15', false, 'number')}
          {campo('Oxígeno 18', 'oxigeno_18', false, 'number')}
          {campo('C:N', 'cn', false, 'number')}
          {campo('Colágeno', 'colageno', false, 'number')}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {campo('Dieta Marina', 'dieta_marina')}
          {campo('Efecto Reservorio', 'efecto_reservorio')}
        </div>
      </section>

      {/* Contexto */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Contexto</h3>
        <div className="flex gap-6 mb-4">
          {check('Doméstico',          'contexto_domestico')}
          {check('Funerario',          'contexto_funerario')}
          {check('Otro',               'contexto_otro')}
          {check('Descontextualizado', 'contexto_descontext')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {campo('Tipo Yacimiento',  'tipo_yacimiento')}
          {campo('Contexto Est.',    'contexto_est')}
          {campo('Contexto Fun. 1',  'contexto_fun_1')}
          {campo('Contexto Fun. 2',  'contexto_fun_2')}
          {campo('Nivel',            'nivel')}
          {campo('UUEE',             'uuee')}
        </div>
      </section>

      {/* Metadatos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Metadatos</h3>
        <div className="grid grid-cols-2 gap-3">
          {campo('Autoría ficha',       'autoria_ficha')}
          {campo('Fecha introducción',  'fecha_introduccion', false, 'date')}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onAnterior}
          className="border border-gray-300 text-gray-700 text-sm px-6 py-2 rounded hover:bg-gray-50"
        >
          ← Anterior
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-6 py-2 rounded"
        >
          {guardando ? 'Guardando...' : '✓ Guardar muestra'}
        </button>
      </div>
    </div>
  )
}
