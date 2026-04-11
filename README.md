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

Estructura del backend:

backend/
├── src/
│   ├── db/
│   │   └── connection.ts          # MySQL con mysql2
│   ├── services/
│   │   ├── webr.ts                # Singleton WebR (se inicia una vez)
│   │   ├── calibration.ts         # llama rcarbon::calibrate()
│   │   ├── spd.ts                 # llama rcarbon::spd(), stackspd()
│   │   └── paleodemography.ts     # llama rcarbon::binPrep(), modelTest()
│   ├── routes/
│   │   ├── muestras.ts            # GET /api/muestras
│   │   ├── calibration.ts         # POST /api/calibrate
│   │   ├── spd.ts                 # POST /api/spd
│   │   └── paleodemography.ts     # POST /api/modeltest
│   └── index.ts                   # Arranca Express
├── package.json
└── tsconfig.json

1. package.json + tsconfig.json
2. services/webr.ts — WebR singleton
3. services/calibration.ts — primer servicio
4. routes/calibration.ts — primer endpoint
5. index.ts — servidor Express


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
routes/calibration.js

Es quien se comunica directamente con el frontend, se encarga de extraer los datos de la base de datos/.csv y se los manda al servicio de calculo "/services/calibration.js", luego coge los resuletados y se los envia de vuelta al frontend.

---------------------------------------------------------------------------