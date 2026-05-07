# TFG Alberto Martel

Repositorio para mi TFG: Visualización y gestión móvil de dataciones radiocarbónicas del proyecto 14C Canarias.

## 22/03/2026
- Inicio de la fase 1: Migración de R a Python de la carga de datos y las funciones de calibración.
- Idea: Separar cada bloque de operaciones en archivos diferentes.
- **data_loading.py**: Validado comprobando que carga correctamente los datos del CSV.
- **calibration.py**: Validado comparando directamente con la función `calibrate()` del paquete `rcarbon`.
- Curvas obtenidas de: https://www.intcal.org/curves.html
- Ejecuté el script de calibración con la curva intcal20.14c para probar su funcionamiento.

## 28/03/2026
- Se migra las funciones de spd (Summed Probability Distribution) para los paneles 3 y 4 de la app
- **spd.py**: Validado comprobando que carga bien los datos y comprobando graficamente con matplotlib que salen iguales que la app R
- Se empieza a migrar paleodemografia.py, que seria el ultimo modulo a migrar

## 09/04/2026 - 10/04/2026

- Los resultados en python no son los esperados y se empìeza a mirar si se puede hacer directamente el backend en JavaScript/TypeScript
- Se encuentra que se puede hacer con WebR -> Una versión de R que se ejecuta en el navegador usando WebAssembly (WASM).

-------------------------------------------------------------------------

package.json -> Define que librerias usa y como se arranca
tsconfig.json-> Le dice al compilador TypeScript como trabajar

-------------------------------------------------------------------------
services/webr.ts:

Es el puente entre el Node.js y R. El usuario llama a la funcion correspondiente de R y se encarga de arrancar WebR y hacer el calculo.

Como arrancar WebR tarda un poco, la solucion es crearlo con el patron Singleton. WebR se crea solo una vez al arrancar el servidor y todas las llamadas pasan por la misma instancia del objeto.

---------------------------------------------------------------------------
services/calibration.js

Es la traduccion directa del panel "Calibrar" de la app.R. Su objetivo es recibir los parametros numericos y pasarselos a rcarbon mediante WebR, luego devolver los resultados listos para enviar al frontend.

No se pone el Idmuestra porque la obtencion del bp y el sd se hace en otra parte del programa. Separacion de responsabilidades (cada pieza hace solo una cosa) y esas cosas. Si en algun momento se cambia la base de datos, el servicio sigue funcionando exactamente igual.

Al final lo que devuelve son vectores con los valores ya calibrados desde R.

---------------------------------------------------------------------------
routes/calibration.ts

Es quien se comunica directamente con el frontend. Recibe la peticion HTTP con el IdMuestra y los parametros opcionales (curva, DeltaR, normalizar), busca el BP y SD correspondientes en el CSV (o en el futuro en MySQL), llama al servicio de calibracion y devuelve el JSON con los resultados.

Endpoint: GET /api/calibrate/:idMuestra?calCurve=intcal20&resOffset=0&resError=0&normalised=false

---------------------------------------------------------------------------
routes/muestras.ts

Devuelve la lista de muestras del CSV para poblar los desplegables del frontend.

Endpoints:
- GET /api/muestras          -> todas las muestras con sus metadatos
- GET /api/muestras/:id      -> datos completos de una muestra concreta (Yacimiento, Isla, BP, SD, Material, etc.)

---------------------------------------------------------------------------
index.ts

Arranca el servidor Express. Inicializa WebR (tarda ~30s la primera vez mientras descarga R y instala rcarbon via WASM), monta los routers bajo /api y sirve los archivos estaticos de public/.

IMPORTANTE: el servidor debe arrancarse desde WSL (Ubuntu en Windows) porque WebR tiene un bug sin resolver en Node.js nativo de Windows relacionado con las rutas de los Worker threads.

Para arrancar desde WSL:
cd /mnt/c/Users/alber/Desktop/TFG_Alberto_Martel/backend
npm run dev

---------------------------------------------------------------------------
public/test.html

Pagina de prueba del Panel 2 (Calibracion). Replica la salida de la app.R original:
- Grafica dual: curva de calibracion (naranja, eje izquierdo C14 BP) + distribucion calibrada (gris, eje derecho probabilidad) + gaussiana de la medida (verde, margen izquierdo)
- Tabla de informacion de la muestra (equivalente a output$ver_informacion de app.R)
- Tabla de calibracion con mediana e intervalos HPD 1sigma y 2sigma (equivalente a output$summary_cal)

Accesible en: http://localhost:3001/test.html

---------------------------------------------------------------------------
services/spd.ts

Replica los Paneles 3 y 4 de la app.R. Tiene dos funciones:

- computeSPD(): equivale a calibrate() + spd() de rcarbon. Recibe arrays de BP y SD,
  calibra todas las fechas y suma las distribuciones en el rango temporal indicado.
  Devuelve prob (el SPD en bruto, la curva roja de R) y smoothed (la media movil,
  la linea azul de R que se obtiene con el parametro runm al hacer plot()).

- computeStackSPD(): equivale a calibrate() + stackspd() de rcarbon. Hace lo mismo
  pero separando las fechas por categorias de grupo (Vida, Adscripcion, etc.) y
  devuelve un SPD independiente por cada categoria. En lugar de usar la estructura
  interna de stackspd ($result[[g]]$grid), calibra una vez y llama a spd() por grupo
  subseteando el objeto CalDates con [.mask], lo que lo hace independiente de la
  version de rcarbon.

Notas de validacion:
- normalised=TRUE en calibrate(): es el default de R. Con FALSE las fechas con SD
  grande pesaban mas que las de SD pequeño, cambiando la forma del SPD.
- circular=TRUE en stats::filter(): es lo que usa plot.CalSPD de rcarbon para la
  media movil. Con sides=2 los extremos daban NA, creando caidas artificiales.

Al igual que calibration.ts, el servicio solo recibe numeros y no sabe nada del CSV
ni de HTTP. Si se cambia la base de datos, el servicio sigue funcionando igual.

---------------------------------------------------------------------------
routes/spd.ts

Expone los endpoints de los Paneles 3 y 4. Carga el CSV al arrancar y filtra las
filas con Higiene en {1..7} (equivalente a filemaker3 de app.R).

Endpoints:
- GET /api/spd/site/:yacimiento  -> Panel 3: SPD de todas las fechas de un yacimiento
    ?calCurve=intcal20 &timeRangeStart=2500 &timeRangeEnd=250 &runm=50
    Responde: { bcad, prob, smoothed, nDates }

- GET /api/spd/isla/:isla        -> Panel 4: stackSPD de todas las fechas de una isla
    ?group=Vida &calCurve=intcal20 &timeRangeStart=2500 &timeRangeEnd=250
    group puede ser: Vida | Adscripcion | Contexto_Est | Material
    Responde: { "Larga": { bcad, prob }, "Corta": { bcad, prob }, ... }

- GET /api/spd/yacimientos       -> lista de yacimientos disponibles (con Higiene 1-7)
- GET /api/spd/islas             -> lista de islas disponibles (con Higiene 1-7)

---------------------------------------------------------------------------
services/paleodemography.ts

Replica el Panel 5 de la app.R (modelTest). Tiene una función:

- computePaleodemography(): equivale a binPrep() + calibrate() + modelTest() de
  rcarbon. Recibe los arrays BP, SD y Yacimiento de una isla, agrupa las fechas
  por yacimiento (binPrep), calibra con normalised=FALSE (requerido por modelTest)
  y ejecuta modelTest() con Monte Carlo para comparar el SPD observado contra el
  esperado bajo un modelo demográfico teórico (exponential, uniform o linear).

  Devuelve dos conjuntos de resultados:
    - SPD observado vs envelope de simulación (nsim percentiles 2.5/97.5) y las
      máscaras de desviación positiva/negativa (excesos/déficits significativos).
    - Rate of Change (ROC) del SPD observado vs envelope de ROC simulados.

Parches especiales para WebAssembly:
  - system() de base R está bloqueado en WASM → se reemplaza con una función vacía
    via assignInNamespace() para que rcarbon no pete al detectar los cores.
  - mclapply() usa fork() (no disponible en WASM) → se sustituye por lapply().
  - detectCores() y ncores=1 se fuerzan para evitar paralelismo.
  - Si modelTest() falla igualmente, se ejecuta una reimplementación manual que
    replica el algoritmo de rcarbon (uncalibrate → calibrate → spd, escalado al
    total del SPD observado).

---------------------------------------------------------------------------
routes/paleodemography.ts

Expone los endpoints del Panel 5. Carga el CSV al arrancar y filtra las
filas con Higiene en {1..7} (equivalente a filemaker3 de app.R).

Endpoints:
- GET /api/paleodemography/isla/:isla  -> Panel 5: modelTest para todas las fechas de una isla
    ?timeRangeStart=2500 &timeRangeEnd=250 &nsim=100 &runm=50 &binH=50 &model=exponential
    model puede ser: exponential | uniform | linear
    Responde: { bcad, spdObs, envelopeHi, envelopeLo, fitModel,
                positiveDev, negativeDev,
                rocObs, rocHi, rocLo, rocPosDev, rocNegDev,
                nDates, nBins, pVal }

- GET /api/paleodemography/islas       -> lista de islas disponibles (con Higiene 1-7)

---------------------------------------------------------------------------
test/test_calibrate.html

Página de prueba del Panel 2 (Calibración). (Ver public/test.html — misma funcionalidad
accesible también desde /test/test_calibrate.html.)

---------------------------------------------------------------------------
test/test_spd_yacimiento.html

Página de prueba del Panel 3 (SPD por yacimiento). Llama a /api/spd/site/:yacimiento
y pinta el SPD con Chart.js: la curva roja (SPD bruto) y la línea azul (media móvil).
Incluye un desplegable con todos los yacimientos disponibles.

---------------------------------------------------------------------------
test/test_spd_isla.html

Página de prueba del Panel 4 (stackSPD por isla). Llama a /api/spd/isla/:isla
y pinta un SPD apilado por categorías (Vida, Adscripcion, etc.) con Chart.js.

---------------------------------------------------------------------------
test/test_paleodemography.html

Página de prueba del Panel 5 (Paleodemografía). Llama a /api/paleodemography/isla/:isla
y pinta dos gráficas con Chart.js:
  - SPD observado (línea negra) + envelope gris (2.5/97.5) + relleno rojo (exceso)
    + relleno azul (déficit) + modelo teórico (línea roja discontinua).
  - Rate of Change observado + envelope simulado con las mismas máscaras.
Usa un plugin de canvas personalizado (makeEnvelopePlugin) para dibujar el
relleno del envelope directamente sobre el canvas sin series de relleno extra.

## 14/04/2026 - 16/04/2026

- Los resultados del motor WebR en el Panel 5 (paleodemografía) son difíciles de
  validar por la lentitud de WebR (~30s de arranque) y los parches necesarios para
  WASM. Se decide añadir un motor Python alternativo (FastAPI) que replica el mismo
  contrato JSON que el backend Node.js, permitiendo cambiar de motor sin tocar el
  frontend.

- Arquitectura dual-engine: Express :3001 sigue siendo el único punto de entrada.
  Una variable de entorno (CALC_ENGINE) decide si los cálculos los hace WebR o
  Python. Se puede sobreescribir por petición añadiendo ?engine=python a la URL.

-------------------------------------------------------------------------

backend/.env

Fichero de configuración del servidor Express (no se sube al repositorio).
Las variables relevantes son:

    CALC_ENGINE=python        # 'python' usa FastAPI, 'webr' usa WebAssembly
    PYTHON_API_URL=http://localhost:8000   # URL del servidor FastAPI

Con CALC_ENGINE=python el backend Express actúa de proxy: reenvía la petición
al servidor FastAPI con los mismos parámetros y devuelve su respuesta directamente,
de modo que el frontend no nota ninguna diferencia.

---------------------------------------------------------------------------
python_api/main.py

Servidor FastAPI que expone las mismas rutas que el backend WebR. Importa los
módulos Python de python_migration/ y los envuelve en endpoints HTTP.

Las 4 curvas de calibración se pre-cargan en el startup (lifespan) para no
repetir la lectura de disco en cada petición.

Endpoints expuestos (mismos parámetros y JSON de respuesta que los de Node.js):

- GET /calibrate
    ?bp=1200 &sd=30 &calCurve=intcal20 &resOffset=0 &resError=0 &normalised=false
    Responde: { bcad, probability, hpd1sigma, hpd2sigma, medianBcad }

- GET /spd/site
    ?bps[]=...  &sds[]=...  &calCurve=intcal20 &timeRangeStart=2500 &timeRangeEnd=250 &runm=50
    Responde: { bcad, prob, smoothed, nDates }

- GET /spd/isla
    ?bps[]=...  &sds[]=...  &groups[]=...  &calCurve=intcal20 &timeRangeStart=2500 &timeRangeEnd=250
    Responde: { "Larga": { bcad, prob }, "Corta": { bcad, prob }, ... }

- GET /paleodemography/isla
    ?bps[]=...  &sds[]=...  &sites[]=...  &calCurve=intcal20
    &timeRangeStart=2500 &timeRangeEnd=250 &nsim=100 &runm=50 &binH=50 &model=exponential
    Responde: { bcad, spdObs, envelopeHi, envelopeLo, fitModel,
                positiveDev, negativeDev,
                rocObs, rocHi, rocLo, rocPosDev, rocNegDev,
                nDates, nBins, pVal }

Todos los vectores se devuelven en orden cronológico (BC→AD, índice 0 = más antiguo)
para que Chart.js los pinte directamente sin invertir.

---------------------------------------------------------------------------
python_api/requirements.txt

Dependencias del motor Python:
    fastapi>=0.110.0
    uvicorn[standard]>=0.27.0
    numpy>=2.0.0
    pandas>=2.0.0
    scipy>=1.12.0

---------------------------------------------------------------------------
python_migration/paleodemografia.py (Panel 5)

Reimplementación en Python del módulo de paleodemografía de rcarbon:

- bin_prep(): equivale a rcarbon::binPrep(). Agrupa las fechas del mismo yacimiento
  que caen dentro de un radio h (en años BP) usando clustering jerárquico de scipy
  (linkage de Ward). Devuelve un array de etiquetas de bin, igual que R.

- model_test(): equivale a rcarbon::modelTest(). Recibe el objeto CalDates calibrado,
  los errores originales, los bins y los parámetros del test. Internamente:
    1. Calcula el SPD observado suavizado con media móvil (runm).
    2. Ajusta el modelo teórico (exponential/uniform/linear) al SPD observado,
       evaluándolo solo donde hay datos reales (spd_obs > 0) para evitar
       extrapolación fuera del rango arqueológico.
    3. Ejecuta nsim simulaciones Monte Carlo: para cada bin muestrea un cal BP
       del modelo ajustado, lo convierte a C14 age interpolando la curva
       (equivale a uncalibrate()), calibra con error = ccError + SD_medición y
       calcula el SPD simulado escalado al total del observado.
    4. Calcula los percentiles 2.5/97.5 del envelope y las máscaras de desviación.
    5. Calcula el Rate of Change y su envelope simulado.
    6. Devuelve un dataclass ModelTestResult con todos los vectores.

Nota de validación: los resultados Python son equivalentes a los de rcarbon en
forma e interpretación. Pequeñas diferencias (~1-2 años) en los límites de los
intervalos son inevitables por diferencias de interpolación interna.

## 17/04/2026 - 29/04/2026 — Migración a Rscript nativo + limpieza del proyecto

### Decisión: abandonar Python y WebR, adoptar Rscript nativo

- WebR tiene un problema fundamental: `system()` está bloqueado en WebAssembly (Emscripten),
  lo que impide que `modelTest()` de rcarbon detecte los cores correctamente. Se probaron varios
  parches (`assignInNamespace`, `Sys.setenv`, `mclapply → lapply`) sin éxito.
- Python daba resultados que no cuadraban lo suficiente con la app R original.
- Solución final: ejecutar **Rscript nativo** como subproceso de Node.js usando `child_process.execFile`.
  Sin restricciones de WASM, sin reescribir algoritmos, resultados idénticos a rcarbon.

### Patrón adaptador: r-engine.ts

Se crea `backend/src/services/r-engine.ts` como capa de abstracción entre los servicios y R:
- Escribe el código R en un fichero temporal, lo ejecuta con Rscript y parsea el JSON de salida.
- El código R termina siempre con un `list(...)` que `jsonlite::toJSON()` serializa a JSON.
- `sink("/dev/null")` suprime las barras de progreso de rcarbon para que no contaminen el JSON.
- Variable de entorno `R_ENGINE=rscript` (por defecto) o `R_ENGINE=plumber` (futuro).
- Los servicios (`calibration.ts`, `spd.ts`) no saben qué motor usan: solo llaman a `runRCode()`.

### Migración de calibration.ts a Rscript

- `calibrate()` ahora usa `runRCode()` en lugar de `runR()` de WebR.
- La curva de display se lee desde `system.file("extdata", "intcal20.14c", package="rcarbon")`,
  la misma copia interna que usa rcarbon para el cálculo, garantizando coherencia visual.
- Nota técnica: las curvas de rcarbon NO están en `data/` (los datasets R normales) sino en
  `extdata/` como ficheros `.14c`. `data()` y `getFromNamespace()` fallaban; la solución fue
  usar `system.file("extdata", ...)` directamente.

### Migración de spd.ts a Rscript

- `computeSPD()` y `computeStackSPD()` reescritos con `runRCode()`.
- Mejora importante: el stack SPD antes hacía N llamadas WebR separadas (una por grupo),
  manteniendo estado en el entorno global. Ahora procesa todos los grupos en un único proceso
  R con un bucle `for` y devuelve la lista anidada completa de una vez.

### Paleodemography: eliminación del fallback WebR

- `paleodemography.ts` ya usaba Rscript para `modelTest()` (generaba los PNGs directamente
  con `plot.SpdModelTest()`). Se elimina el bloque WebR que nunca llegó a ejecutarse.
- El flujo final: Rscript genera los dos PNG (SPD y Rate of Change), se leen como base64,
  y el frontend los muestra directamente con `<img>`. No se mandan vectores de datos al frontend.

### Eliminación de WebR del arranque

- `initWebR()` eliminado de `index.ts`: el servidor arranca instantáneamente sin esperar
  ~30s a que WebR descargue R y compile rcarbon vía WASM.
- `webr.ts` eliminado del proyecto por completo.

### Limpieza general del proyecto

Ficheros y carpetas eliminados por no hacer ya ninguna falta:
- `python_migration/` — módulos Python (calibration.py, spd.py, paleodemografia.py, data_loading.py)
- `python_api/` — servidor FastAPI
- `venv/` — entorno virtual Python
- `database/curves/` — copias locales de las curvas IntCal (rcarbon las tiene en su extdata/)
- Imágenes y JSON de validación (calibration_panel2_test.png, spd_panel3_test.png, etc.)
- `backend/.node-xmlhttprequest-sync-619` — artefacto de lock de WebR

### Cierre del backend

Todos los paneles validados en las páginas de prueba HTML. El backend se da por finalizado
a falta de la integración con MySQL (actualmente los datos se leen del CSV al arrancar).

## 01/05/2026 — Inicio del frontend: stack, estructura y HomePage

### Decisión de stack

Se elige el siguiente stack para el frontend:

| Herramienta | Motivo |
|---|---|
| **Vite + React + TypeScript** | Estándar de la industria, arranque instantáneo, tipado completo |
| **Tailwind CSS v3** | Utilidades CSS inline, diseño responsivo trivial, sin ficheros CSS propios |
| **TanStack Query** | Gestión automática de loading/error/caché para las llamadas al backend |
| **React Router v6** | Navegación entre los 5 paneles sin recarga de página |
| **Chart.js + react-chartjs-2** | Librería de gráficas compatible con los datos que devuelve el backend |
| **React Leaflet** | Mapa interactivo para el Panel 1 (cartografiar) |

Se decide adoptar una estrategia **UI-first**: construir toda la interfaz con datos mock primero y conectar el backend en una segunda fase. Esto permite iterar sobre el diseño sin depender de que el servidor esté corriendo.

### Estructura de carpetas

```
frontend/src/
├── api/          ← cliente fetch tipado (Fase 2)
├── types/        ← interfaces TypeScript de cada respuesta del backend
├── hooks/        ← hooks de TanStack Query (Fase 2)
├── components/
│   ├── ui/       ← componentes base reutilizables
│   ├── charts/   ← componentes de gráficas (Fase 2)
│   └── layout/   ← AppShell, Sidebar
└── pages/
    └── panels/   ← un fichero por panel
```

### Tipos API — src/types/api.ts

Se definen las interfaces TypeScript que describen exactamente la forma de cada respuesta del backend: `CalibrationResult`, `SPDResult`, `StackSPDResult`, `PaleodemographyResult`, `Muestra`. Este fichero actúa como contrato entre backend y frontend: si cambia un campo del backend, TypeScript marca en rojo todos los sitios afectados.

### HomePage

Se construye la página principal con:
- Cabecera con título y descripción del proyecto
- Grid de 6 tarjetas (`PanelCard`) que navegan a cada panel: Cartografiar, Calibrar, SPD Yacimiento, SPD Isla, Paleodemografía y Guía de uso
- Footer con logos de entidades colaboradoras (`Footer`)
- Componentes base creados: `Card`, `PanelCard`, `Footer`
- React Router configurado con una ruta por panel

### Paleta de colores

Se define una paleta centralizada en `tailwind.config.js` bajo el nombre `brand`, con tres opciones comentadas para facilitar el cambio futuro:
- **Activa — Azul marino académico**: `brand-dark: #1e3a5f`, `brand-mid: #2e6da4`, `brand-light: #f8fafc`
- Opción B guardada: Tierra volcánica (`#3d2b1f`)
- Opción C guardada: Teal científico (`#0f4c5c`)

---

## 02/05/2026 — Guía de uso, layout y Panel 2 (Calibración)

### Página de guía de uso

Se construye la página `/guia` con toda la información de la pestaña "Sobre la app" de la app.R original, rediseñada en formato moderno:
- Cabecera con título centrado, botón volver y fecha de última actualización en esquina inferior derecha
- Sección de descripción general de la aplicación
- Grid de 5 `PanelCard` que abren un `Modal` con las instrucciones detalladas de cada panel (en lugar de texto largo en pantalla)
- Sección de cómo citar la publicación original
- Bibliografía completa con estilo de lista académica
- Contacto del autor original (Salvador Pardo-Gordó, ULL)

Componente `Modal` creado como componente base reutilizable: recibe `isOpen`, `onClose`, `title`, `children` y `headerColor`. El fondo oscuro se cierra al hacer clic fuera del modal.

### Layout — AppShell y Sidebar

Se define la estructura de layout para los paneles de análisis:
- `AppShell`: header ancho completo (logo + título del panel), sidebar colapsable a la izquierda, área de contenido flexible
- `Sidebar`: navegación con `NavLink` de React Router, iconos siempre visibles, texto visible solo cuando está expandido, panel activo resaltado con `bg-brand-dark`
- Botón hamburguesa (☰) en la parte superior del sidebar, alineado a la izquierda, para colapsar/expandir
- El logo en el header navega a la HomePage al hacer clic

### Panel 2 — Calibración individual

Primer panel de análisis construido con el layout definitivo:

Filtros en barra superior centrada:
- `Select` — Id-Muestra
- `Select` — Curva de calibración (intcal20, intcal13, marine20, marine13)
- `Input` numérico — DeltaR (corrección marina, default 0)
- `Input` numérico — Error DeltaR (default 0)
- `Select` — Normalizar probabilidad (Sí/No)
- Botón `Calcular`

Área de resultados mock debajo, lista para recibir la gráfica de calibración.

---

## 03/05/2026 — Paneles 3, 4, 5 y Panel 1 (Cartografiar)

### Panel 3 — SPD por yacimiento

Filtros: selector de yacimiento, inicio cal BP (2500), fin cal BP (250), suavizado en años (50).
Se elimina el selector de curva de calibración respecto al diseño inicial: la app.R original no lo expone en este panel y el backend usa `intcal20` por defecto.

### Panel 4 — SPD por unidad geográfica

Filtros: selector de isla, agrupación por categoría (Vida, Adscripcion, Contexto_Est, Material), inicio cal BP, fin cal BP.
Área de resultados mock lista para el gráfico de SPD apilado.

### Panel 5 — Paleodemografía

Filtros: isla, modelo demográfico (exponential/uniform/linear), inicio/fin cal BP, simulaciones Monte Carlo (máx 100), suavizado, agrupación en años (binH), ratio de crecimiento (ROC/SPD).
Dos áreas de resultados mock: SPD observado vs modelo teórico (gráfica superior) y Rate of Change (gráfica inferior), igual que la app.R original.

### Panel 1 — Cartografiar (diseño diferente)

Al ser un panel centrado en el mapa, se adopta un diseño de **controles flotantes** en lugar de barra de filtros fija:
- El mapa ocupa el 100% del área de contenido (`absolute inset-0`)
- Un único botón "🎚️ Filtros" flota sobre el mapa (esquina superior izquierda, `z-index` alto)
- Al pulsarlo se despliega un panel compacto encima del mapa sin desplazarlo ni reducirlo
- El panel contiene el slider de BP máximo y el selector de agrupación (cluster/puntos individuales)
- Hacer clic sobre el mapa cierra el panel (`stopPropagation` evita cierres accidentales al interactuar con los controles)
- `AppShell` acepta prop `mainClassName` para que el mapa pueda usar `overflow-hidden` en lugar del `overflow-auto` del resto de paneles

### Componentes UI reutilizables creados

| Componente | Descripción |
|---|---|
| `Card` | Contenedor con sombra, bordes redondeados y efecto hover opcional |
| `PanelCard` | Tarjeta de navegación con icono, título y descripción |
| `Modal` | Popup con fondo oscuro, cabecera de color, scroll interno y cierre al hacer clic fuera |
| `Select` | Selector con `appearance-none` para eliminar estilos nativos del navegador, flecha personalizada |
| `Slider` | Slider con track de color, thumb circular visible, etiqueta con valor actual y mín/máx |
| `Footer` | Footer con logos de entidades colaboradoras y créditos |

### Estado al cierre del día

La **Fase 1 (UI con mock data) está completada**. Las 7 páginas de la aplicación están construidas y navegables. El siguiente paso es la Fase 2: conectar el backend creando `src/api/client.ts` y los hooks de TanStack Query, sustituyendo los datos mock por llamadas reales a Express en `:3001`.


### 06-05-2026 — Panel 2 (Calibración) completado

- Se conecta el frontend al backend: `src/api/client.ts`, hooks TanStack Query (`useCalibration`, `useMuestras`) y el patrón `enabled` para lanzar el fetch solo al pulsar "Calcular".
- `CalibrationChart.tsx` reescrito para replicar exactamente `plot.CalDates()` de rcarbon:
  - `hscale=0.3`: la distribución de probabilidad ocupa el 30 % inferior del rango C14 y se representa en el mismo eje que la curva IntCal20
  - Plugin canvas (`gaussPlugin`) que dibuja el polígono relleno de la distribución gaussiana horizontal, porque Chart.js no soporta relleno horizontal nativo
  - Eje derecho (`yProb`) como anotación: mismo rango de píxeles que `yC14`, con ticks calculados via `afterBuildTicks`
  - `crosshairPlugin.ts` creado como factory reutilizable: `createCrosshairPlugin(getLines)` devuelve un plugin con línea discontinua y tooltip de canvas, compartible entre todas las gráficas
- Desplegable de muestras muestra solo el `IdMuestra`, ordenado alfabéticamente

### 07-05-2026 — Paneles 3 y 4 (SPD yacimiento y SPD isla) completados

- **Panel 3 — SPD por yacimiento**:
  - `SPDChart.tsx`: área roja semitransparente (SPD bruto, `fill: 'origin'`) + línea azul (media móvil). Crosshair muestra año, valor SPD y valor de la media móvil interpolados.
  - `SPD_yacimiento.tsx` conectado a `useSPDSite` con el patrón `calcular`: la query solo se lanza al pulsar el botón; cambiar cualquier filtro reinicia el estado.
  - Tabla de fechas del yacimiento debajo del gráfico (columnas: IdMuestra, Isla, BP, SD, Vida, Material, Especie, Adscripcion, Id_BibTeX), filtrada por `Higiene ∈ {1..7}`.
- **Panel 4 — SPD por unidad geográfica**:
  - `StackSPDChart.tsx` reescrito como multipanel: un `<Line>` de 160 px por categoría del grupo, escala Y global compartida (`yMax × 1.05`), PALETTE de 6 colores.
  - Etiqueta "Summed Probability" en un `<div>` CSS rotado fuera de las gráficas, centrada verticalmente sobre el bloque entero (igual que el eje Y compartido de R).
  - Nombre de cada categoría como `<p>` CSS por encima del panel correspondiente, separado visualmente del área de datos.
  - Ordenación con `localeCompare` consciente del locale español para respetar acentos.
  - `SDP_isla.tsx` conectado a `useIslas` + `useSPDIsland` con el mismo patrón `calcular`.