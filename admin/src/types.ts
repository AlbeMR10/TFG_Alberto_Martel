export interface Muestra {
  id: number
  IdMuestra: string
  BP: number
  SD: number
  Yacimiento: string
  Isla: string
  Localidad: string
  Provincia: string
  UnidadGeografica: string
  Lat: number | null
  Lon: number | null
  Vida: string | null
  Material: string | null
  Tipo: string | null
  Cantidad: string | null
  Especie: string | null
  Carbono_13: number | null
  Nitrogeno_15: number | null
  Oxigeno_18: number | null
  CN: number | null
  Colageno: number | null
  DietaMarina: string | null
  EfectoReservorio: string | null
  CtxDomestico: boolean
  CtxFunerario: boolean
  CtxOtro: boolean
  CtxDescontext: boolean
  TipoYacimiento: string | null
  ContextoEst: string | null
  ContextoFun1: string | null
  ContextoFun2: string | null
  Nivel: string | null
  UUEE: string | null
  Adscripcion: string | null
  AutoriaFicha: string | null
  FechaIntroduccion: string | null
  Higiene: number | null
  Referencia: string | null
  IdBibTeX: string | null
  id_yacimiento: number
  id_biblio: number | null
}

export interface Yacimiento {
  id: number
  nombre: string
  localidad: string | null
  isla: string | null
  provincia: string | null
  unidad_geografica: string | null
}

export interface Bibliografia {
  id: number
  id_bibtex: string
  referencia: string | null
}

export type BiblioInput =
  | { tipo: 'existente'; id: number }
  | { tipo: 'nueva'; id_bibtex: string; referencia: string }

export type YacInput =
  | { tipo: 'existente'; id: number }
  | { tipo: 'nuevo'; nombre: string; localidad: string; isla: string; provincia: string; unidad_geografica: string }
