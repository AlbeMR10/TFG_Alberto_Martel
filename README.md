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