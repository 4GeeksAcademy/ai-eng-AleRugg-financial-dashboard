# Guía de especificaciones del dashboard

Esta guía prepara a una nueva sesión del agente para continuar las tres funcionalidades sin confundir requisitos aprobados, contratos existentes y cambios propuestos. No implica que esas funcionalidades estén implementadas.

## Arquitectura actual

- El frontend monta una sola vista desde `frontend/src/main.tsx` hacia `frontend/src/App.tsx`.
- `App` actualmente solicita únicamente `GET /api/metrics`, calcula KPIs y series mensuales en `src/lib/financial-utils.ts` y muestra `KPIRow`, `IncomeOutcomeChart` y `ProfitPercentChart`.
- El tipo actual de movimiento y las uniones `Category`, `BusinessType` y `OperationType` están en `src/lib/financial-types.ts`.
- El backend registra rutas en `backend/app/routes.py`; sus modelos Pydantic de respuesta están en ese archivo.
- Vite sirve el frontend en `5173` y configura el proxy `/api` hacia `http://backend:8000` (`frontend/vite.config.ts`).
- Los movimientos backend son simulados; no hay base de datos persistente.
- Reutilizables existentes: `DashboardHeader`, `KPIRow`, `KPICard`, `IncomeOutcomeChart`, `ProfitPercentChart`, `Card` y `Skeleton`. No hay router ni componentes reutilizables actuales de fecha o tabla. Recharts y `formatCurrency`/`formatPercent` sí existen.

## Fuentes y verificación

El OpenAPI de `/docs` descrito abajo se consultó en vivo el 13 de octubre de 2026. Las respuestas de las rutas también se consultaron directamente en esa ejecución. Los resultados por proxy se registran aparte; repetirlos antes de asumir que su estado continúa.

### Resultados live

La consulta registró códigos, formas, cantidad y nombres de campos, sin importes ni movimientos individuales.

| URL | Parámetros | HTTP | Forma observada |
| --- | --- | --- | --- |
| `http://localhost:8000/docs` | `GET`, ninguno | `200` | HTML Swagger de FastAPI. |
| `http://localhost:8000/openapi.json` | `GET`, ninguno | `200` | OpenAPI `3.1.0`, `Financial Metrics API`, versión `0.1.0`. |
| `http://localhost:8000/health` | `GET` | `200` | Objeto con `status`. |
| `http://localhost:8000/api/metrics` | `GET`, sin query | `200` | Array de 360, campos `amount`, `business_type`, `category`, `create_date`, `operation_type`. |
| `http://localhost:8000/api/metrics/facets` | `GET` | `200` | Objeto con `business_types`, `categories`, `max_date`, `min_date`, `operation_types`. |
| `http://localhost:8000/api/metrics/alerts?threshold=0.3&group_by=month` | `GET` | `200` | Array de 4, campos `baseline_average`, `increase_ratio`, `outcome_total`, `period`. |
| `http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2B` | `GET` | `200` | Array de 2, campos `category`, `operation_type`, `total_amount`. |
| `http://localhost:8000/api/metrics/categories/top?operation_type=income&limit=5&business_type=B2C` | `GET` | `200` | Array de 2, campos `category`, `operation_type`, `total_amount`. |
| `http://localhost:8000/api/metrics/summary?group_by=month&operation_type=income&business_type=B2B` | `GET` | `200` | Array de 12, campos `income`, `net`, `outcome`, `period`. |
| `http://localhost:8000/api/metrics/summary?group_by=month&operation_type=income&business_type=B2C` | `GET` | `200` | Array de 12, campos `income`, `net`, `outcome`, `period`. |
| `http://localhost:8000/api/metrics?start_date=2026-06-01&end_date=2026-05-01` | Rango invertido | `200` | Array vacío: el backend actual no rechaza este rango. |
| `http://localhost:8000/api/metrics/alerts?threshold=1.01&group_by=month` | `GET` | `200` | Array de 1: no hay máximo actual de threshold. |
| `http://localhost:8000/api/metrics/alerts?threshold=-0.1&group_by=month` | `GET` | `422` | FastAPI rechaza el valor bajo el mínimo actual `0`. |

Las mismas siete rutas `/api` (metrics, facets, alerts, categorías B2B/B2C y summary B2B/B2C) se probaron por `localhost:5173`; todas agotaron el timeout de cuatro segundos, sin estado HTTP ni cuerpo. Desde el contenedor frontend, `http://backend:8000/health` también agotó el timeout de cuatro segundos. `docker compose ps` mostró ambos contenedores `Up`. La conectividad frontend-proxy-backend falló en esta ejecución; repetir antes de afirmar su estado futuro.

No se probaron live: dataset vacío para facets, categorías top sin grupo, `limit` inválido, ni todas las combinaciones de fechas. No inferir sus respuestas live a partir de las pruebas anteriores.

## Funcionalidad 1: filtro de fechas

### Requisito y decisiones

- Dos inputs nativos opcionales; valores API `YYYY-MM-DD`, referencia visible `DD/MM/YYYY`.
- Aplicación automática: omitir parámetros vacíos, usar ambos o solo el que tenga valor. Los límites son inclusivos; se permiten fechas fuera del rango de referencia.
- Un rango invertido no genera petición frontend: mostrar el mensaje aprobado y conservar los últimos datos válidos.
- Si falla facets, conservar el dashboard si metrics carga, mostrar aviso y permitir reintentar facets.

### Contrato actual y tipos

`GET /api/metrics` acepta `start_date`, `end_date`, `category`, `operation_type`, todos opcionales. Filtra inclusivamente y devuelve un array de `FinancialMovement`: `create_date`, `amount`, `operation_type`, `category`, `business_type`.

`GET /api/metrics/facets` no tiene parámetros. Devuelve `operation_types`, `business_types`, `categories`, `min_date`, `max_date`; las fechas actuales son obligatorias y no anulables. Se representan en `FacetsResponse`; el tipo futuro es `ProposedFacetsResponse`. Los filtros están en `DateRangeFilter`.

### Cambios futuros y casos límite

- Hacer anulables las fechas de facets para dataset vacío; actualizar modelo, OpenAPI y tipos. El helper actual indexa primer/último movimiento y no tolera una lista vacía.
- Validar rango invertido solo en `/api/metrics` con `422`; hoy el caso live probado devuelve `200` y `[]`.
- Vacíos: omitir ambos filtros y mostrar todos los datos. Fuera del dataset: mostrar ceros/estado sin datos con la respuesta vacía. Rango invertido: no pedir datos, mostrar error y conservar resultados válidos. Error facets: aviso y reintento aislados.

## Funcionalidad 2: alertas de anomalías

### Requisito y decisiones

- Tabla con período, outcome, media de tres períodos anteriores e incremento porcentual.
- Umbral como proporción, default deseado `0.3` (`30 %`) y rango deseado `0.01–1.0`; usar agrupación mensual.
- Requiere datos válidos para los tres meses calendario previos; ausencia no es cero. Baseline cero no alerta.
- Meses parciales que intersectan el rango se muestran con outcome del rango y baseline de los tres meses completos anteriores; documentar el posible sesgo.
- Estado vacío y error propios de la tabla; no ocultar KPIs/gráficos. Respuestas antiguas no reemplazan las nuevas.

### Contrato actual y tipos

`GET /api/metrics/alerts` acepta `threshold` (default `0.3`, mínimo `0`, sin máximo), `group_by` (`day`, `week`, `month`, default `month`), fechas y `business_type` opcionales. Devuelve un array de `MetricsAlert`: `period`, `outcome_total`, `baseline_average`, `increase_ratio`. `AlertsParams` es el subconjunto acordado (umbral y fechas), no la firma completa de la ruta.

Live: `threshold=0.3&group_by=month` dio `200` y 4 elementos; `1.01` dio `200`; `-0.1` dio `422`. El código actual promedia todos los períodos previos y filtra fechas antes de agrupar.

### Cambios futuros y casos límite

- Limitar umbral a `0.01–1.0`; usar exactamente tres meses completos válidos y traer historia anterior al inicio del rango.
- Si falta cualquier mes previo, no alertar; baseline cero, no alertar. Ambos casos deben verificarse.
- Si la lista es `[]`, mostrar estado vacío. Si falla la petición, mostrar error solo en la tabla. Si llega respuesta tardía de filtro anterior, descartarla.

## Funcionalidad 3: comparativa B2B vs B2C

### Requisito y decisiones

- Página nueva en navegación interna de `App`, sin router, con tablas paralelas y un único gráfico inferior.
- Reutilizar fechas globales cuando la Funcionalidad 1 esté disponible.
- Mostrar solo categorías devueltas (hasta cinco). Porcentaje `—` con total cero.
- Moneda real pendiente: `formatCurrency` usa USD/en-US, pero el modelo no declara moneda.

### Contratos actuales y tipos

`GET /api/metrics/categories/top` acepta `operation_type` (`income`/`outcome`, default `outcome`), `limit` entero `1–20` (default `5`), fechas opcionales y `business_type` (`B2B`/`B2C`) opcional. Devuelve `TopCategoriesResponse` (`category`, `operation_type`, `total_amount`). El grupo se identifica en la query; no hay campo de grupo en cada fila. La vista envía income, limit 5 y una petición por grupo.

Live: top B2B y B2C, con income/limit5, respondieron `200`, dos filas cada uno.

`GET /api/metrics/facets` devuelve actualmente categorías globales, no separadas por grupo. `ProposedFacetsResponse` añade `income_categories_by_business_type` y es futuro, no un campo API actual.

`GET /api/metrics/summary` acepta `group_by` (enum `day/week/month`, default `month`), fechas y filtros de categoría, operación y grupo. Devuelve arrays con `period`, `income`, `outcome`, `net`. Live, requests mensuales de ingresos B2B/B2C dieron `200` y 12 filas cada uno.

Usar summary para sumar `income` por grupo (denominador y gráfico), categorías de `categories/top` para filas, y facets para el catálogo por grupo cuando se implemente el cambio. Falta definir en `api-types.ts` `MetricsSummaryEntry` y `MetricsSummaryResponse`; no reutilizar `MonthlyDataPoint`.

### Cambios futuros y casos límite

- Ampliar facets con categorías de ingresos por B2B/B2C; conservar campos actuales.
- Denominador cero: `—` y total cero en gráfico. Menos de cinco categorías: solo filas recibidas. Rango sin resultados: tablas vacías y totales vacíos/cero sin filas inventadas.
- Ranking combinado accidental: asegurarse de enviar `business_type` en cada consulta. Error de facets: no presentarlo como catálogo separado si solo hay facets global.
- Confirmar moneda de origen antes de considerar `formatCurrency` una representación semánticamente correcta.

## Verificación y pasos para una nueva sesión

1. Leer `AGENTS.md`, `.agents/rules/frontend.md`, `.agents/rules/backend.md` y las tres especificaciones.
2. Consultar `/docs` o `/openapi.json` live y contrastar cada query/modelo con `backend/app/routes.py`.
3. Repetir endpoints directos y por `http://localhost:5173`; registrar URL, query, hora, código HTTP, forma/campos y límites. Las comprobaciones de este README son del `2026-10-13 12:32 UTC`; no suponer que el estado live continúa.
4. Resolver primero las brechas contractuales: facets nullable/por grupo, reglas de threshold/alertas y tipo de summary.
5. Diseñar componentes usando los tipos existentes; añadir tests para los casos límite de cada funcionalidad antes de declarar integración verificada.
6. Ejecutar `docker compose exec frontend npm test`, `npm run lint`, `npm run build` y backend `pytest`, además de las comprobaciones manuales descritas en `verification.md`.

`npx tsc --noEmit` desde `frontend` usa `tsconfig.json`, que referencia `tsconfig.app.json` (incluye `src`) y `tsconfig.node.json` (incluye `vite.config.ts`). No incluye `frontend/specs/`; por tanto, esa orden no valida los tipos ni los snippets de especificación. No afirmar que `specs/` pasó la comprobación de TypeScript.