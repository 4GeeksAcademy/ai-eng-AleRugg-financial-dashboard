# Vista comparativa B2B vs B2C

## Objetivo

Crear una página dentro del dashboard para comparar los ingresos de las líneas de negocio B2B y B2C, usando las mismas fechas seleccionadas en la Funcionalidad 1 cuando dicho filtro esté disponible.

## Requisitos del PM

- Mostrar dos secciones paralelas, una por línea de negocio.
- Cada sección contiene una tabla de hasta cinco categorías de ingresos con nombre, total de ingresos y porcentaje sobre el total de ingresos de ese grupo.
- Mostrar debajo de ambas secciones un único gráfico que compare los ingresos totales de B2B y B2C.
- Permitir filtrar la comparativa con un rango de fechas enviado como `YYYY-MM-DD`.
- Obtener de facets las categorías disponibles para cada grupo.

## Decisiones acordadas

- Añadir la vista mediante navegación interna dentro de `App`; no incorporar un router.
- Reutilizar el estado global del rango de fechas de la Funcionalidad 1 cuando esté disponible. No crear un segundo filtro independiente.
- Mostrar `—` para el porcentaje si el total de ingresos del grupo es cero.
- Mostrar solo las categorías disponibles si un grupo tiene menos de cinco; no crear filas ficticias.
- Mantener pendiente la confirmación de moneda. No modificar el formato monetario global ni asumir que USD es la moneda real.

## Navegación y composición

El frontend actual monta una sola `App` y muestra una vista de dashboard; no tiene una biblioteca de rutas instalada. Añadir la comparativa como una vista seleccionable dentro de `App`, manteniendo la composición existente y sin nuevas dependencias de navegación.

La página contiene las secciones B2B y B2C en paralelo y, debajo, un solo gráfico con los totales de ingresos de ambas líneas. Los estados de carga, error o ausencia de resultados de la comparativa deben mantenerse dentro de su vista y no reemplazar datos de otras vistas.

## Facets por grupo

### Comportamiento actual

El contrato actual de `GET /api/metrics/facets` devuelve `categories`, `business_types`, `operation_types`, `min_date` y `max_date`. `categories` es una lista global y no indica qué categorías de ingreso corresponden a cada negocio.

`GET /api/metrics/categories/top` admite `business_type`, `start_date` y `end_date`; devuelve el ranking filtrado, pero sin `business_type` el ranking es combinado. El endpoint `summary` admite los mismos filtros de grupo y fecha y permite sumar `income` para obtener el total del grupo.

El código de [App.tsx](../src/App.tsx) actualmente solo consulta `GET /api/metrics`; facets, categories/top y summary no están integrados en el frontend. El código y el OpenAPI adjunto describen las formas existentes, pero las respuestas de estos endpoints no se verificaron en vivo. Consultar [verification.md](../../verification.md).

### Cambio contractual propuesto, aún no implementado

Para satisfacer el requisito de categorías disponibles por grupo, ampliar `MetricsFacets` con:

```json
{
  "income_categories_by_business_type": {
    "B2B": ["sales"],
    "B2C": ["sales"]
  }
}
```

El campo debe contener las categorías que tengan movimientos `income` para cada `business_type`, calculadas sobre el conjunto de datos disponible. Conservar los campos actuales de facets para no eliminar información usada por otros consumidores. Actualizar el modelo Pydantic, OpenAPI, el tipo TypeScript y sus pruebas.

## Datos y cálculos

### Rankings por categoría

Consultar `GET /api/metrics/categories/top` una vez para cada grupo, con:

- `operation_type=income`
- `limit=5`
- `business_type=B2B` o `business_type=B2C`
- `start_date` y `end_date` del filtro compartido, si tienen valor

El endpoint ya acepta esos parámetros. `operation_type` tiene default `outcome`, por lo que la comparación debe enviar explícitamente `income`. El resultado proporciona `category`, `operation_type` y `total_amount`, ordenados por total descendente.

### Total del grupo y porcentajes

El endpoint de categorías principales no devuelve el total general del grupo. Obtenerlo desde `GET /api/metrics/summary`, usando el mismo grupo, rango de fechas, `operation_type=income` y `group_by=month`; sumar el campo `income` de los períodos devueltos.

Calcular cada porcentaje como:

`total_amount / total_income_group * 100`

Si `total_income_group` es cero, mostrar `—`. Si el ranking contiene menos de cinco categorías, presentar solo las filas devueltas por la API. El total usado por el gráfico debe ser el mismo denominador calculado para cada grupo.

Usar las mismas fechas para ambas llamadas de ranking y para ambos totales. Si no hay fechas activas, omitir ambos parámetros en todas las peticiones.

## Contrato de API

El OpenAPI adjunto y el código actual declaran:

- `GET /api/metrics/categories/top`: `operation_type`, `limit`, `start_date`, `end_date` y `business_type`; respuesta `list[TopCategoryItem]` con `category`, `operation_type` y `total_amount`.
- `GET /api/metrics/summary`: `group_by`, fechas, `category`, `operation_type` y `business_type`; respuesta con períodos e importes `income`, `outcome` y `net`.
- `GET /api/metrics/facets`: listas globales de categorías, tipos de negocio y operaciones, además de fechas mínima y máxima.

El contrato de `categories/top` y `summary` ya permite obtener los rankings y totales filtrados sin añadir rutas. La separación de categorías de ingreso por grupo en facets es un cambio propuesto y no existe en el contrato actual.

## Tipos y componentes

- Reutilizar `BusinessType` y `Category` de `frontend/src/lib/financial-types.ts`.
- Añadir tipos frontend alineados con `TopCategoryItem`, `MetricsSummaryItem` y la ampliación de `MetricsFacets`.
- Reutilizar `Card` de `frontend/src/components/ui/card.tsx` como contenedor si encaja con la composición de la página.
- Reutilizar Recharts, ya usado por los gráficos del dashboard, para el gráfico único de comparación. No existe actualmente una tabla comparativa ni un gráfico de totales B2B/B2C.
- Reutilizar `formatCurrency` de `frontend/src/lib/financial-utils.ts` sin alterar su configuración global.

## Moneda

`formatCurrency` usa actualmente USD y formato `en-US`, sin decimales. El modelo `FinancialMovement` solo define `amount` y no especifica una moneda. La moneda real queda pendiente de confirmación; mientras tanto, no debe presentarse USD como un dato confirmado ni cambiarse el formato global como parte de esta funcionalidad.

## Verificación

- Verificar que las peticiones de rankings incluyan `operation_type=income`, `limit=5`, el grupo correcto y las fechas compartidas.
- Verificar que B2B y B2C devuelvan rankings independientes y ordenados.
- Verificar que facets exponga las categorías de ingreso disponibles separadas por grupo y preserve sus campos existentes.
- Verificar el cálculo del porcentaje con denominador positivo y la presentación `—` con denominador cero.
- Verificar que se muestren menos de cinco filas cuando haya menos categorías disponibles.
- Verificar rangos sin resultados, tablas vacías y los totales que alimentan el gráfico.
- Verificar que el total de cada grupo coincida con la suma de sus ingresos bajo el mismo rango.
- Verificar navegación interna y persistencia del rango compartido entre la vista principal y la comparativa.
- Verificar la presentación monetaria existente y dejar constancia de que la moneda de origen no está declarada.