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