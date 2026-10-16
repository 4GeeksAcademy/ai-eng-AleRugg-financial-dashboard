# Reglas propuestas

Estas reglas se basan en la implementación actual y una revisión estática. Son requisitos propuestos, no afirmaciones de que el comportamiento deseado ya esté implementado ni validado en ejecución. Para el procedimiento de comprobación, consultar `verification.md`.

## Frontend

- **Interpretar fechas de calendario:** trata `YYYY-MM-DD` como fecha sin zona horaria y agrupa por año-mes sin convertirla de forma que pueda cambiar el día o el mes. Añade pruebas de límites de mes y de zona horaria. La implementación actual construye un `Date` desde la cadena; revisar ese camino. Referencias: `frontend/src/lib/financial-utils.ts` y `frontend/src/lib/financial-utils.test.ts`.
- **Mostrar el periodo de los datos:** deriva el periodo del conjunto recibido o de los filtros activos; no uses una etiqueta estática. Actualmente el encabezado muestra `2024 - Full Year`, pero la respuesta se genera alrededor de la fecha actual y el texto no filtra los movimientos. Referencias: `frontend/src/App.tsx` y `backend/app/routes.py`.
- **Recuperarse de fallos de carga:** conserva estados visibles de carga y error y ofrece reintento o recuperación cuando el backend no estaba disponible al iniciar. Hoy `App` hace una sola petición y `docker-compose.yml` no configura una comprobación de disponibilidad.
- **Representar la respuesta que realmente se consume:** el dashboard solicita `GET /api/metrics`, y calcula en el frontend KPIs y agrupaciones a partir de movimientos. No describas los endpoints analíticos adicionales como parte del flujo del dashboard hasta que la interfaz los consuma. Mantén tipos y contrato alineados y prueba los estados de carga, error y datos recibidos.

## Backend

- **Usar aleatoriedad local:** para generar datos reproducibles, crea un generador local `random.Random(seed)` y úsalo en todas las funciones de generación; no cambies el estado aleatorio global con `random.seed()`. Referencias: `backend/app/routes.py` y `backend/tests/test_routes.py`.
- **Preservar y probar el contrato de la API:** conserva modelos, valores permitidos, filtros y forma de las respuestas; al cambiar rutas o campos, actualiza pruebas y tipos de TypeScript que correspondan. Verifica orden cronológico y reproducibilidad. Referencias: `backend/app/routes.py`, `backend/tests/test_routes.py` y `frontend/src/lib/financial-types.ts`.

## Integración

- **Mantener alineado el contrato en la integración:** coordina rutas, campos y valores permitidos entre FastAPI y TypeScript. Comprueba que la respuesta de `GET /api/metrics` atraviesa el proxy y alimenta los cálculos de la interfaz. Referencias: `frontend/src/App.tsx`, `frontend/src/lib/financial-types.ts`, `frontend/vite.config.ts` y `backend/app/routes.py`.
- **Comprobar disponibilidad real:** no asumas que `depends_on` significa que el backend ya acepta peticiones. Usa reintentos en la interfaz o una comprobación de salud con espera, y prueba el caso en que el backend tarda en arrancar. Referencias: `docker-compose.yml` y `frontend/src/App.tsx`.
- **Mantener sincronizada la documentación de ejecución:** si cambian puertos, proxy o variables de entorno, actualiza `README.es.md` y `verification.md`. Referencias: `README.es.md`, `docker-compose.yml` y `frontend/vite.config.ts`.
