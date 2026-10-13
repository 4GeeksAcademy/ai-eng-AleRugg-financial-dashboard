
## Proyecto

Dashboard de métricas financieras con una interfaz web y una API. Los movimientos actuales son datos simulados; 

## Stack y estructura

- Frontend: React, TypeScript, Vite, Tailwind y Recharts.
- Backend: Python, FastAPI, Pydantic y Uvicorn. `debugpy` escucha en el puerto `5678` dentro del contenedor.
- `docker-compose.yml` define los servicios `frontend` y `backend`.
- Entrada del frontend: `frontend/index.html` -> `frontend/src/main.tsx` -> `frontend/src/App.tsx`.
- `frontend/src/components/dashboard/` contiene encabezado, KPIs y gráficos; `frontend/src/lib/` contiene tipos y cálculos.
- Entrada del backend: `backend/app/main.py` crea FastAPI y registra las rutas de `backend/app/routes.py`.
- Pruebas: `frontend/src/lib/financial-utils.test.ts` y `backend/tests/`.

## Flujo actual de datos

- `frontend/src/App.tsx` solicita `GET /api/metrics`. En Compose, `frontend/vite.config.ts` reenvía `/api` a `http://backend:8000`; fuera de Compose, configurar `VITE_API_BASE_URL` según el README.
- El backend genera 360 movimientos simulados y ordenados, con semilla `42`; el año depende de la fecha actual. El conjunto cubre los 12 meses hasta el mes anterior al actual y no se lee ni persiste en una base de datos.
- La respuesta de `/api/metrics` contiene movimientos; el frontend calcula localmente KPIs y agregados mensuales en `frontend/src/lib/financial-utils.ts`. Los endpoints analíticos adicionales del backend no los consume actualmente el dashboard.
- El frontend muestra carga y error, pero hace una única petición inicial y no se recupera automáticamente si la API empieza a responder después. `depends_on` no indica que el backend ya esté listo.
- El encabezado actual muestra `2024 - Full Year` de forma fija: no corresponde necesariamente al periodo de la respuesta y no aplica un filtro.

## Comandos

Desde la raíz, levantar los servicios:

```bash
docker compose up --build
```

Con los contenedores ejecutándose, en otra terminal:

```bash
docker compose exec frontend npm test
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
docker compose exec backend pytest
```

Detenerlos con `docker compose down`.

## Convenciones

- Mantener presentación en componentes y cálculos financieros reutilizables en `frontend/src/lib/`.
- Usar componentes React en PascalCase, archivos de componentes en kebab-case, funciones TypeScript en camelCase y funciones Python en snake_case.
- Mantener alineados los tipos de TypeScript y los modelos/respuestas Pydantic. Si cambia una ruta, un campo o un valor permitido, actualizar ambos lados y sus pruebas.
- Mantener visibles los estados de carga y error al solicitar datos; no silenciar errores de API.
- Al cambiar la integración, verificar que la respuesta real llega a los cálculos y a la interfaz; no basta con comprobar que el contenedor inicia.

## Reglas de dominio

- `operation_type` admite `income` y `outcome`; `business_type` admite `B2B` y `B2C`. Las categorías permitidas están definidas en `backend/app/routes.py`.
- Las fechas `YYYY-MM-DD` representan fechas de calendario; al agrupar por mes no permitir desplazamientos por zona horaria.
- Beneficio = ingresos - gastos. Margen = beneficio / ingresos * 100; si no hay ingresos, el margen es 0.
- Los datos simulados usan semilla para ser reproducibles. Usar un generador aleatorio local, no cambiar el estado aleatorio global.
- El periodo mostrado debe corresponder a los datos, no a una etiqueta fija.

## Forma de trabajar

- Antes de analizar o editar, revisar las reglas y skills de `.agents/` y `memory-bank/` si existen, además de las instrucciones locales aplicables.
- Antes de trabajar en frontend, leer `.agents/rules/frontend.md`.
- Antes de trabajar en backend, leer `.agents/rules/backend.md`.
- Si el cambio afecta frontend y backend o su contrato, leer ambas reglas antes de empezar.
- Seguir primero las convenciones y helpers existentes. Hacer cambios acotados y evitar refactors no relacionados.
- Para cambios de fechas, cálculos o contrato de API, actualizar o añadir pruebas que cubran los casos límite.
- No asumir que `depends_on` significa que el backend está listo. Conservar reintentos en la interfaz o agregar una comprobación de disponibilidad.
- Actualizar `README.es.md` si cambian comandos, puertos, proxy o variables de entorno.

## Límites

- No presentar los movimientos simulados como datos financieros reales.
- Las fechas `YYYY-MM-DD` son fechas de calendario; no convertirlas de manera que la zona horaria cambie el día o el mes al agrupar.
- La generación actual usa `random.seed()` y modifica el estado aleatorio global; usar un generador local `random.Random(seed)` en cualquier cambio a la generación.
- La configuración CORS actual permite cualquier origen; restringirlos antes de usar el backend en producción.

## Verificación

- Frontend: `docker compose exec frontend npm test`, `docker compose exec frontend npm run lint` y `docker compose exec frontend npm run build`.
- Backend: `docker compose exec backend pytest`.
- Seguir [verification.md](verification.md) para los pasos manuales, criterios de respuesta, comprobación del proxy y contraste de cálculos.
- Comprobar por separado `http://localhost:8000/api/metrics` y `http://localhost:5173/api/metrics`. Si la API directa responde y el proxy devuelve `502`, revisar los logs de Vite y comprobar desde el contenedor frontend que `backend:8000` resuelve y acepta conexiones.
- Las pruebas actuales no incluyen una prueba de integración del componente `App` que cubra petición, renderizado y recuperación ante fallo. Añadirla al ampliar la cobertura del flujo de extremo a extremo.
- Informar qué pruebas se ejecutaron. No afirmar que la verificación manual pasó sin solicitar la API y abrir la interfaz.
