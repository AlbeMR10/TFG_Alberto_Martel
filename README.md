# Diario de Trabajo - TFG Alberto Martel

Repositorio para mi TFG: Reingeniería de una aplicación web para análisis de dataciones radiocarbónicas de las Islas Canarias.

## 22/03/2026
- Inicio de la fase 1: Migración de R a Python de la carga de datos y las funciones de calibración.
- Idea: Separar cada bloque de operaciones en archivos diferentes.
- **data_loading.py**: Validado comprobando que carga correctamente los datos del CSV.
- **calibration.py**: Validado comparando directamente con la función `calibrate()` del paquete `rcarbon`.
- Curvas obtenidas de: https://www.intcal.org/curves.html
- Ejecuté el script de calibración con la curva intcal20.14c para probar su funcionamiento.