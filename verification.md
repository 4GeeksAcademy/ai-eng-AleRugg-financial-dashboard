# Verificación del proyecto

Esta guía define cómo comprobar el flujo actual. Los movimientos son datos simulados: no hay base de datos ni persistencia. El frontend obtiene movimientos de la API y calcula localmente los KPIs y las series de los gráficos.

## Mapa del flujo

| Análisis | Elemento 1 | Elemento 2 |
| --- | --- | --- |
| Estructura | `frontend/src/components/dashboard/` muestra el panel y sus gráficos. | `backend/app/routes.py` define la API y sus datos de ejemplo. |
| Servicios | Frontend Vite: `5173`. | Backend FastAPI: `8000`. |
| Puntos de entrada | `frontend/index.html` carga `src/main.tsx`, que muestra `src/App.tsx`. | `backend/Dockerfile` inicia `app.main:app`; `backend/app/main.py` registra las rutas. |
| Comunicación | `frontend/src/App.tsx` solicita `GET /api/metrics` y recibe movimientos. | `frontend/vite.config.ts` reenvía `/api` a `backend:8000` en Compose. |
| Presentación | `frontend/src/lib/financial-utils.ts` calcula KPIs y agrupa movimientos por mes. | La interfaz los representa en `frontend/src/components/dashboard/`. |

El dashboard actual no consume los endpoints analíticos adicionales del backend. El encabezado `2024 - Full Year` es texto fijo; no filtra ni describe necesariamente las fechas devueltas.

## Fuentes y estado de las comprobaciones

Separar siempre el contrato documentado, la inspección del código y las respuestas obtenidas en vivo. Las menciones de OpenAPI más abajo se basan en el JSON de `/openapi.json` compartido en la conversación; no equivalen a una consulta live.

### Registro histórico de ejecución

Fecha de registro: `2026-10-13`. La hora exacta de cada comprobación no quedó registrada. Estos resultados son históricos y deben repetirse para confirmar el estado actual.

| Fuente y URL | Parámetros | Estado observado | Campos o resultado | Estado de la comprobación |
| --- | --- | --- | --- | --- |
| `docker compose up --build` | Ninguno | Proceso terminó con código `0` | Los contenedores se iniciaron; esto no prueba que las rutas sean accesibles. | Histórico; repetir si se requiere confirmar el entorno actual. |
| `http://localhost:8000/health` | `GET`, ninguno | Respuesta correcta; el código HTTP exacto no se capturó | `{"status":"ok"}` | Histórico; repetir y registrar código HTTP. |
| `http://localhost:8000/api/metrics` | `GET`, sin query | `curl --fail` terminó correctamente; código HTTP exacto no capturado | 360 registros; campos esperados presentes; orden cronológico; primera fecha `2025-10-02`, última `2026-09-28`. | Histórico; repetir y registrar código HTTP. |
| `http://localhost:5173/api/metrics` | `GET`, sin query | `502` | Sin JSON de métricas; los logs de Vite registraron timeout conectando a `172.18.0.2:8000`. | Incidencia histórica pendiente de repetir; no es un fallo actual confirmado. |
| Desde el contenedor frontend: `http://backend:8000/health` | `GET`, timeout de prueba de 3 segundos | Timeout; no se obtuvo código HTTP | La petición no recibió cuerpo antes del timeout. | Incidencia histórica pendiente de repetir; no confirma la conectividad actual. |
| `http://localhost:5173/` | `GET`, ninguno | `200` | Vite sirvió la página HTML; no se inspeccionó visualmente el dashboard. | Histórico; repetir para confirmar estado actual. |

### Contrato OpenAPI compartido, no verificado en vivo

El esquema aportado documenta las siguientes rutas y formas. Esta tabla registra el contrato mostrado, no respuestas HTTP observadas. La consulta actual de `/docs` y `/openapi.json` está pendiente.

| URL y método | Parámetros documentados | Forma de respuesta documentada | Live |
| --- | --- | --- | --- |
| `http://localhost:8000/docs` / `GET` | Ninguno | Interfaz Swagger esperada de FastAPI; no consultada en vivo. | Pendiente |
| `http://localhost:8000/openapi.json` / `GET` | Ninguno | Documento OpenAPI; el JSON compartido declara `openapi: 3.1.0` y las rutas de abajo. | Pendiente |
| `http://localhost:8000/api/metrics` / `GET` | `start_date`, `end_date`, `category`, `operation_type`, opcionales | Array de movimientos: `create_date`, `amount`, `operation_type`, `category`, `business_type`. | Pendiente |
| `http://localhost:8000/api/metrics/facets` / `GET` | Ninguno | `operation_types`, `business_types`, `categories`, `min_date`, `max_date`. | Pendiente |
| `http://localhost:8000/api/metrics/alerts` / `GET` | `threshold` default `0.3`, mínimo `0`; `group_by` default `month`; fechas y `business_type` opcionales | Array con `period`, `outcome_total`, `baseline_average`, `increase_ratio`. | Pendiente |
| `http://localhost:8000/api/metrics/categories/top` / `GET` | `operation_type` default `outcome`; `limit` default `5`, entre `1` y `20`; fechas y `business_type` opcionales | Array con `category`, `operation_type`, `total_amount`. | Pendiente |
| `http://localhost:8000/api/metrics/summary` / `GET` | `group_by` default `month`; fechas, `category`, `operation_type` y `business_type` opcionales | Array con `period`, `income`, `outcome`, `net`. | Pendiente |

### Consultas live pendientes

Repetir las solicitudes de la tabla anterior contra `localhost:8000` y registrar fecha/hora, URL completa, query, estado HTTP, `Content-Type`, claves observadas y si la forma coincide con el contrato. Para cada endpoint bajo `/api`, repetir la misma ruta y parámetros mediante `http://localhost:5173` para verificar el proxy. No inferir el estado actual del proxy a partir del `502` histórico.

Las respuestas live de `/api/metrics/facets`, `/api/metrics/alerts`, `/api/metrics/categories/top` y `/api/metrics/summary` no se han registrado. Tampoco se consultaron `/docs` ni `/openapi.json` en vivo. Mantener esos casos como pendientes hasta ejecutar las solicitudes y registrar sus resultados.

La implementación actual debe contrastarse con las propuestas futuras en `frontend/specs/`: las fechas anulables de facets, la validación de rangos invertidos, límites y ventana móvil de alertas, y las categorías de facets por negocio no deben presentarse como capacidades actuales.

## Pruebas automatizadas

Con los servicios levantados desde la raíz del proyecto, ejecutar:

```bash
docker compose exec frontend npm test
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
docker compose exec backend pytest
```

Registrar el resultado de cada comando. Las pruebas unitarias frontend cubren cálculos y formato; las pruebas backend cubren salud, filtros, orden, respuestas y endpoints analíticos. No sustituyen una comprobación del proxy ni del renderizado del dashboard.

## Comprobación manual

1. Levantar los servicios con `docker compose up --build` y confirmar que termina sin error.
2. Comprobar `http://localhost:8000/health` y esperar `{"status":"ok"}`.
3. Abrir `http://localhost:8000/docs` y confirmar que FastAPI publica `/api/metrics`.
4. Solicitar `http://localhost:8000/api/metrics`; comprobar estado `200`, una lista de movimientos con `create_date`, `amount`, `operation_type`, `category` y `business_type`, y orden cronológico. Con la generación actual se esperan 360 registros.
5. Abrir `http://localhost:5173` y revisar en Network que `GET /api/metrics` responde mediante el proxy. Confirmar que termina la carga y se muestran KPIs y gráficos no vacíos.
6. Contrastar ingresos, gastos, beneficio y margen visibles con los movimientos recibidos. El margen esperado es `(ingresos - gastos) / ingresos * 100`, o `0` si los ingresos son `0`.
7. Anotar por separado cualquier discrepancia entre fechas devueltas y el encabezado fijo `2024 - Full Year`; actualmente el encabezado no se deriva de los datos.

## Criterios de aceptación y límites

- La respuesta real de la API alimenta el dashboard; los datos de muestra no deben describirse como datos financieros reales.
- Si la API no responde, la interfaz debe mostrar un error visible. Actualmente solo hace una petición inicial: no se recupera automáticamente si el backend se inicia después. Verificar recuperación únicamente cuando se implemente un reintento o una acción para volver a cargar.
- `depends_on` establece orden de inicio, no disponibilidad. Un `docker compose up --build` exitoso no demuestra por sí solo que la API respondió o que el dashboard renderizó datos.
- No marcar la comprobación manual como aprobada sin haber solicitado la API y abierto la interfaz.
- Informar qué comandos se ejecutaron y qué pasos manuales se comprobaron; distinguir fallos, pendientes y verificaciones no realizadas.


