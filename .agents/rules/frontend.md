# Reglas de frontend

## Objetivo
Mantener correctos los valores y periodos que la interfaz calcula y presenta desde la API, incluidos los estados de carga, error y recuperación.

## Justificación
`frontend/src/App.tsx` solicita `GET /api/metrics`, recibe movimientos y calcula en el cliente los KPIs y las series mensuales con `frontend/src/lib/financial-utils.ts`. No consume los endpoints analíticos adicionales del backend. La agrupación convierte la cadena `YYYY-MM-DD` a `Date`, lo que puede cambiar el día o el mes según la zona horaria; las pruebas actuales no cubren ese límite. El encabezado está fijado en `2024 - Full Year` y no representa necesariamente las fechas recibidas. La carga muestra error si falla la única petición inicial, pero no ofrece reintento; `depends_on` tampoco garantiza que la API esté lista.

## Reglas
- Trata `YYYY-MM-DD` como fecha de calendario; no permitas que la zona horaria del navegador cambie el día o el mes al agrupar. Cuando baste para el contrato, extrae directamente año y mes de la cadena.
- Obtén el periodo mostrado de las fechas recibidas o de los filtros activos; no lo fijes como texto estático ni des por hecho que el encabezado filtra datos.
- Mantén explícitos los estados de carga, error y datos. Si la API no está lista al primer intento, permite reintentar o recuperarse sin recargar manualmente la página.
- Mantén tipos del cliente alineados con la respuesta de `GET /api/metrics`. No presentes como consumidos por el dashboard otros endpoints hasta que exista ese flujo.
- Añade pruebas para límites de mes, ausencia de ingresos, respuesta vacía o válida y fallo/reintento de la carga de datos.
- Mantén los cálculos financieros reutilizables en `frontend/src/lib/` y la presentación en componentes.

## Ejemplo correcto
Agrupa una fecha ISO usando su parte de año y mes, sin convertirla a la zona horaria local:

```ts
const yearMonthKey = movement.create_date.slice(0, 7);
```

## Ejemplo incorrecto
Esta conversión existente puede desplazar la fecha de calendario al interpretar una cadena sin hora en distintas zonas horarias:

```ts
const yearMonthKey = toYearMonthKey(new Date(m.create_date));
```
