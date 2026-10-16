# Componentes de las funcionalidades del dashboard

Este documento propone estructura y props; no implica que los componentes o las llamadas a API ya estén implementados.

## Arquitectura compartida

`App` es actualmente la única vista: coordina una petición inicial a `GET /api/metrics` y muestra KPIs y gráficos. Debe seguir siendo el propietario del estado compartido de navegación, fechas, peticiones y estados de carga/error. Los componentes de presentación reciben datos y callbacks mediante props.

El frontend reutiliza `DashboardHeader`, `KPIRow`, `KPICard`, `IncomeOutcomeChart`, `ProfitPercentChart`, `Card` y `Skeleton`. No hay actualmente componentes reutilizables de inputs de fecha, tablas o navegación. Recharts y los helpers `formatCurrency` y `formatPercent` sí existen.

Tipos compartidos y respuestas definidos en la fase 2:

- `DateRangeFilter`, `AlertsParams` y `TopCategoriesParam` en `param-types.ts`.
- `FacetsResponse`, `ProposedFacetsResponse`, `AlertEntry`, `AlertsResponse`, `CategoryEntry` y `TopCategoriesResponse` en `api-types.ts`.
- `Category`, `BusinessType`, `OperationType`, `FinancialMovement`, `KPIMetrics` y `MonthlyDataPoint` en `src/lib/financial-types.ts`.

## Funcionalidad 1: filtro de fechas

### `DateRangeControls`

**Responsabilidad propuesta:** presentar dos inputs nativos opcionales, el rango disponible, errores de rango invertido y el aviso de facets. Los valores se conservan como `YYYY-MM-DD`; los límites de referencia se presentan como `DD/MM/YYYY`. Un rango invertido no dispara una petición y mantiene los últimos resultados válidos.

**Props propuestas:**

```ts
interface DateRangeControlsProps {
  value: DateRangeFilter;
  facets: FacetsResponse | ProposedFacetsResponse | null;
  facetsLoading: boolean;
  facetsError: string | null;
  rangeError: string | null;
  onChange: (value: DateRangeFilter) => void;
  onRetryFacets: () => void;
}
```

`FacetsResponse` representa la respuesta actual, con `min_date` y `max_date` no anulables y categorías globales. `ProposedFacetsResponse` solo corresponde después de que la API añada fechas anulables y `income_categories_by_business_type`.

**Estados:** carga inicial de facets; fallo con aviso y reintento independiente de métricas; dataset vacío identificado por fechas nulas en el contrato futuro; rango invertido con mensaje. La API actual todavía no representa fechas nulas en facets ni valida el rango invertido.

**Reutilización:** `DashboardHeader` puede seguir presentando el período, pero no gestiona filtros. No existe un input de fecha compartido.

## Funcionalidad 2: alertas de anomalías

### `AnomalyAlertsPanel`

**Responsabilidad propuesta:** controlar el umbral, solicitar/renderizar alertas y mantener sus estados aislados de los KPIs y gráficos.

**Props propuestas:**

```ts
interface AnomalyAlertsPanelProps {
  params: AlertsParams;
  alerts: AlertsResponse | null;
  loading: boolean;
  error: string | null;
  onThresholdChange: (threshold: number) => void;
}
```

`AlertsParams` representa el subconjunto elegido para esta vista: umbral y fechas. El endpoint también admite `group_by` y `business_type`, pero esta funcionalidad usa el default mensual y no filtra por negocio. No debe describirse `AlertsParams` como la firma completa de la ruta.

`null` en `alerts` significa que aún no hay resultado; `[]` significa que la consulta terminó sin alertas. Con alertas se muestra la tabla con las cuatro propiedades de `AlertEntry`: `period`, `outcome_total`, `baseline_average` e `increase_ratio`. El último campo es una proporción que se presenta como porcentaje.

**Estados:** carga; error propio del panel sin ocultar otros indicadores; array vacío con mensaje explícito; filas cuando haya alertas. Las respuestas obsoletas no deben reemplazar las del filtro más reciente.

**Reutilización:** `Card` y `Skeleton`; `formatCurrency` y `formatPercent`. La moneda de `formatCurrency` es USD/`en-US`, pero el modelo no confirma moneda de origen.

## Funcionalidad 3: comparativa B2B vs B2C

### Navegación interna

`App` conserva la vista principal y selecciona la comparativa mediante navegación interna, sin router. El control visual concreto de navegación sigue pendiente; no se prescribe aquí una pestaña, botón u otro patrón.

### `B2BvsB2CPage`

**Responsabilidad propuesta:** recibir el rango compartido, mostrar las dos secciones en paralelo y un gráfico único debajo.

**Props propuestas:**

```ts
interface B2BvsB2CPageProps {
  dateRange: DateRangeFilter;
  facets: FacetsResponse | ProposedFacetsResponse | null;
  b2bEntries: TopCategoriesResponse;
  b2cEntries: TopCategoriesResponse;
  b2bTotalIncome: number;
  b2cTotalIncome: number;
  facetsLoading: boolean;
  rankingsLoading: boolean;
  totalsLoading: boolean;
  error: string | null;
}
```

### `BusinessCategorySection`

**Responsabilidad propuesta:** mostrar una tabla por grupo con nombre de categoría, total de ingresos y porcentaje del total de ese grupo.

**Props propuestas:**

```ts
interface BusinessCategorySectionProps {
  businessType: BusinessType;
  availableCategories: Category[];
  entries: TopCategoriesResponse;
  totalIncome: number;
}
```

`availableCategories` proviene de `ProposedFacetsResponse.income_categories_by_business_type`, cuando el cambio futuro de facets exista. `entries` proviene de `categories/top`; `CategoryEntry` no contiene grupo porque este se envía como parámetro `business_type`. Renderizar solo las filas devueltas por el ranking, sin inventar filas a partir del catálogo de facets. Calcular porcentaje como `total_amount / totalIncome * 100`; mostrar `—` si `totalIncome` es cero.

### `RevenueComparisonChart`

**Responsabilidad propuesta:** comparar en un único gráfico los dos totales calculados con el mismo rango.

**Props propuestas:**

```ts
interface RevenueComparisonChartProps {
  b2bTotalIncome: number;
  b2cTotalIncome: number;
  loading: boolean;
  error: string | null;
}
```

**Datos y contratos:** `categories/top` acepta `business_type`, fechas, `operation_type` y `limit`; la comparativa hace una petición por grupo con `operation_type=income` y `limit=5`. La respuesta contiene `CategoryEntry[]`, sin porcentaje ni grupo. `summary` acepta el grupo y las fechas y devuelve `period`, `income`, `outcome` y `net`; se sumaría `income` para calcular los totales.

**Incompatibilidad pendiente:** no existe todavía un tipo para la respuesta de `summary` en `api-types.ts`. Antes de implementar el cálculo y el gráfico, definir `MetricsSummaryEntry` y `MetricsSummaryResponse` alineados con esos cuatro campos reales. No reutilizar `MonthlyDataPoint`, cuya forma es distinta.

**Estados:** cargar facets, rankings y totales; mostrar errores de la comparativa sin reemplazar otras vistas; con fechas sin resultados, mostrar tablas sin filas y representar los totales recibidos (incluidos ceros). La moneda real sigue sin verificarse: `formatCurrency` usa USD/`en-US`, y el modelo no tiene campo de moneda.

**Reutilización:** `Card`, el patrón de carga/error/empty de los gráficos existentes, Recharts, `formatCurrency`, `Category`, `BusinessType` y `TopCategoriesResponse`.

## Requisitos, decisiones y pendientes

**Requisitos del PM:** filtro de fechas; panel de alertas con umbral, tabla, estado vacío y respeto al rango; comparativa con dos tablas de top cinco y un gráfico de totales.

**Decisiones acordadas:** fecha compartida entre vistas; estados aislados de errores de facets/alertas/comparativa; navegación interna sin router; no generar filas ficticias; porcentaje `—` con denominador cero; tipos de facets futuros separados del contrato actual.

**Cambios de contrato futuros:** facets debe permitir fechas nulas y exponer categorías de ingreso por grupo; alertas necesita el rango de threshold y el cálculo acordados; el frontend necesita tipos de respuesta para `summary` antes de calcular totales comparativos.

**Cuestiones pendientes:** elegir el control visual de navegación interna; confirmar moneda de origen; implementar/validar en el backend los cambios de facets y alertas antes de tratarlos como contratos disponibles. No existe actualmente tabla, gráfico comparativo, filtro de fechas ni integración de estos endpoints en `App`.