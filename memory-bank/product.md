# Resumen del producto

## Overview del producto

Dashboard web de métricas financieras que presenta ingresos, gastos, beneficio, margen y evolución mensual. El frontend obtiene movimientos de la API y calcula los KPIs y series mensuales. El backend genera datos de ejemplo; el código revisado no muestra una base de datos ni persistencia.

El frontend consulta `GET /api/metrics`. El backend también ofrece endpoints de salud, filtros y resúmenes analíticos en `backend/app/routes.py`, aunque el dashboard actual solo solicita `/api/metrics` (`frontend/src/App.tsx`).

## Stack tecnológico

- **Lenguajes:** TypeScript y Python; CSS para estilos.
- **Frontend:** React 19, Vite 8, Tailwind CSS 4 y Recharts 3. Dependencias destacadas: `lucide-react`, `clsx`, `tailwind-merge` y `class-variance-authority`.
- **Backend:** FastAPI, Pydantic y Uvicorn. Los movimientos y respuestas se modelan y validan en la API.
- **Infraestructura y herramientas:** Docker Compose coordina `frontend` y `backend`; las imágenes usan Node 24 Alpine y Python 3.13 slim. Vite sirve el frontend en `5173` y reenvía `/api` a `backend:8000`; el backend expone `8000` y `debugpy` usa `5678`.
- **Pruebas y calidad:** Vitest para frontend, ESLint y TypeScript; pytest y httpx para backend.

## Estado actual

- Los movimientos son simulados: el backend genera 360 registros (30 por mes durante 12 meses) con semilla `42`; no hay almacenamiento persistente.
- El frontend muestra estados de carga y error, pero hace una sola solicitud inicial y no reintenta si la API todavía no responde.
- El encabezado del frontend tiene el texto fijo `2024 - Full Year`, mientras que el backend asigna fechas relativas al año actual. Esa etiqueta no aplica un filtro.
- El agrupamiento mensual usa año y mes directamente de la fecha `YYYY-MM-DD`, sin convertirla a la zona horaria local. La prueba de cálculos mensuales incluye el primer día de un mes.
- La generación usa `random.seed()` del módulo global; la regla propuesta es usar un generador local para no alterar el estado aleatorio compartido.
- El terminal registra `docker compose up --build` con código de salida `0`; no se confirmó manualmente en el navegador ni mediante una solicitud a los endpoints.

## Skills y evidencia de uso

### Accesibilidad (`accessibility`)

- **Origen y propósito:** skill comunitaria disponible en `.agents/skills/accessibility/SKILL.md` y registrada en `skills-lock.json`. Orienta la accesibilidad de interfaces según WCAG 2.2, incluyendo semántica, teclado y foco, lectores de pantalla, contraste y tamaño de controles.
- **Motivo de selección:** el dashboard es una interfaz React con estados dinámicos, gráficos y valores que deben ser perceptibles y operables. La skill aplica a la revisión de esos elementos web; sus instrucciones también cubren plataformas que no forman parte de este proyecto.
- **Estado y evidencia:** se consultó y aplicó como criterio de auditoría, y se marcó `lang="es"` en los anuncios de carga y error en `frontend/src/App.tsx`. Se conservaron las regiones status/alert, etiquetas de los gráficos, tablas accesibles, `accessibilityLayer` de Recharts, foco visible, e iconos decorativos ocultos. `frontend/index.html` solo referencia un favicon; no hay imágenes de contenido a las que añadir `alt`.
- **Contraste:** se calcularon ratios a partir de los tokens OKLCH del tema oscuro y su conversión a sRGB; los valores revisados fueron texto principal 15.77:1, texto atenuado 5.17:1, líneas de gráficos 5.08:1–6.34:1, foco 4.68:1, texto del aviso sobre su fondo translúcido aproximadamente 16.48:1 y texto de la insignia de gastos 6.17:1. Superan los umbrales WCAG de referencia para esos pares. Es una comprobación estática de los tokens, no una auditoría visual en navegador.
- **Verificación pendiente:** no se realizó un recorrido de teclado en ejecución ni una comprobación con lector de pantalla; tampoco se certificó conformidad WCAG 2.2 completa. No se encontraron botones, enlaces, formularios u otros controles propios en el código revisado; los gráficos son los elementos interactivos identificados. La navegación de estos no se probó manualmente.
- **Uso futuro:** cargarla al construir o auditar componentes web cuando el trabajo afecte semántica, navegación por teclado, foco, contraste o tecnologías de asistencia. No presentar una inspección estática como certificación de conformidad.

### Buenas prácticas de React (`vercel-react-best-practices`)

- **Origen:** skill general del ecosistema, ubicada en `.agents/skills/vercel-react-best-practices/SKILL.md` y registrada en `skills-lock.json`.
- **Propósito:** orientar cambios y revisiones de React/Next.js hacia rendimiento y buenas prácticas: carga de datos, evitar esperas en cadena, tamaño del bundle, renderizados repetidos, trabajo de renderizado y rendimiento de JavaScript. En este proyecto aplica al frontend React/Vite y ayuda a revisar la carga de `/api/metrics`, la separación de los gráficos y el comportamiento de componentes React para una entrega eficiente.
- **Estado y evidencia:** se consultó para revisar el frontend existente, sus imports de imágenes y fuentes, metadatos, carga diferida y patrones de renderizado. Solo se encontró el favicon, no hay imágenes de contenido ni fuentes externas; CSS usa una pila de fuentes del sistema, e `index.html` conserva título, descripción y viewport. Los dos gráficos ya se cargan mediante `lazy` y `Suspense`, por lo que no se hicieron cambios React adicionales ni se atribuyeron optimizaciones anteriores a esta skill.
- **Uso futuro:** cargarla desde la ruta indicada al crear, refactorizar o revisar componentes React, carga de datos o bundle. Sus reglas generales no sustituyen las convenciones financieras específicas del repositorio.

### Rendimiento (`performance-optimization`)

- **Origen y motivo de selección:** skill comunitaria del ecosistema, ubicada en `.agents/skills/performance-optimization/SKILL.md` y registrada en `skills-lock.json`. Fue una elección adicional seleccionada para cumplir los requisitos de la tarea de rendimiento; no fue creada por el usuario ni se establece como convención permanente del proyecto.
- **Estado y evidencia:** se aplicó anteriormente para guiar cambios concretos en el cálculo de KPIs, la agrupación mensual y el filtrado de movimientos. En esta revisión volvió a usarse como criterio; no se añadieron optimizaciones de rendimiento porque no se identificó un cuello de botella medido. Las pruebas, lint y build del trabajo anterior pasaron.
- **Cambios documentados:** se acumularon los KPIs en una pasada, se agrupó usando el prefijo de fecha ISO y se eliminó una ordenación redundante después del filtrado. La agrupación por fecha ISO también conserva correctamente el mes de calendario.
- **Verificación en esta tarea:** el build reportó el bundle inicial `index` en 59.95 kB gzip y los gráficos en chunks diferidos (`income-outcome-chart` 3.44 kB, `profit-percent-chart` 2.74 kB; `LineChart` 100.50 kB). No se ejecutó perfil de runtime ni una medición antes/después comparable; no se afirma una mejora de rendimiento cuantificada.
- **Uso futuro:** seleccionarla adicionalmente cuando haya una pregunta de rendimiento que medir. Consultarla no implica que haya cambios; mantener solo optimizaciones justificadas por mediciones.

### Formato financiero personalizado (`financial-data-formatting`)

- **Origen y propósito:** skill personalizada creada por el usuario para este repositorio, ubicada en `.skills/financial-data-formatting/SKILL.md`. Mantiene coherentes los formatos de importes, monedas, porcentajes, fechas y datos ausentes sin alterar valores ni cálculos.
- **Reglas principales:** reutilizar `formatCurrency` y `formatPercent` de `frontend/src/lib/financial-utils.ts`; conservar la precisión numérica y redondear solo al mostrar; distinguir cero de datos ausentes; preservar el calendario ISO `YYYY-MM-DD`; y respetar los formatos compactos propios de ejes de gráficos.
- **Estado y evidencia:** se comprobó que el agente podía leer el archivo y se utilizó en una auditoría de solo lectura sobre código real. En esta tarea se implementaron después las dos correcciones propuestas. Para futuras tareas, pedir explícitamente que se use la skill y cargar esta ruta. No se ha verificado que `.skills/` se descubra automáticamente ni que la skill pueda invocarse como comando.

#### Hallazgos de la auditoría de formato

La auditoría inicial fue de solo lectura y no modificó archivos funcionales. Las correcciones de los dos hallazgos se aplicaron posteriormente en esta tarea y se verificaron con las pruebas del frontend.

1. **Corregido y probado: margen de 0 % tratado como ausencia.** `frontend/src/components/dashboard/profit-percent-chart.tsx` y `income-outcome-chart.tsx` determinan el estado vacío según si hay puntos (`data.length`), no según si sus valores son distintos de cero. La nueva prueba `frontend/src/components/dashboard/financial-charts.test.tsx` verifica que los puntos cero se muestran y que arreglos vacíos conservan el mensaje de ausencia.
2. **Corregido y probado: formato porcentual duplicado.** El tooltip y la tabla accesible de `profit-percent-chart.tsx` reutilizan `formatPercent`; el eje conserva su formato compacto de cero decimales. La prueba comprueba que el margen cero se muestra como `0.0%`.
3. **Correcto: formato de importes completos.** Los KPI y el tooltip/tabla de ingresos y gastos reutilizan `formatCurrency`. El eje usa una etiqueta compacta en miles, adecuada a su contexto; no se propuso cambio.
4. **Correcto: valor KPI ausente.** `frontend/src/components/dashboard/kpi-row.tsx` muestra `—` cuando `metrics` es `null`; la ausencia permanece diferenciada de un valor numérico cero; no se propuso cambio.
5. **Correcto: fechas mensuales.** `frontend/src/lib/financial-utils.ts` agrupa con el prefijo `YYYY-MM` de la fecha ISO y presenta etiquetas abreviadas de mes y año. La agrupación no convierte la fecha original a la zona horaria local; no se propuso cambio.

#### Verificaciones y pendientes

Verificación de esta tarea: `docker compose exec frontend npm test` pasó con 7 pruebas en 2 archivos; `docker compose exec frontend npm run lint` y `docker compose exec frontend npm run build` pasaron. También se ejecutó ESLint enfocado para `App.tsx`, las dos pruebas nuevas de gráficos y una comprobación estática de contraste. No se ejecutaron pruebas backend porque no se modificó el backend. La comprobación manual de teclado y lector de pantalla sigue pendiente.

En conjunto, `vercel-react-best-practices` y `performance-optimization` aportan criterios generales del ecosistema; `accessibility` guía la revisión WCAG; y `financial-data-formatting`, creada para este repositorio, define convenciones financieras específicas. La auditoría de formato encontró dos problemas que ahora están corregidos y verificados, además de tres casos que ya seguían las convenciones.
