# Alertas de anomalías del dashboard

## Objetivo

Añadir debajo de los gráficos del dashboard principal una tabla que destaque períodos mensuales en los que el gasto aumentó de forma inesperada.

## Requisitos del PM

- La tabla tiene cuatro columnas: período, outcome registrado, media móvil de los tres períodos anteriores e incremento porcentual.
- El usuario configura el umbral con un input numérico entre `0.01` y `1.0`; el valor predeterminado es `0.3`.
- Si no hay anomalías para el umbral seleccionado, mostrar un estado vacío explícito.
- La tabla respeta el rango de fechas seleccionado en el dashboard cuando está activo.
- El endpoint relevante es `GET /api/metrics/alerts?threshold=<ratio>`.

## Decisiones acordadas

- Usar la agrupación mensual predeterminada; no añadir un selector de día, semana o mes.
- Mostrar los períodos como `YYYY-MM`, el formato que devuelve el resumen mensual de la API.
- Una alerta requiere datos válidos en los tres meses calendario inmediatamente anteriores al período evaluado. Si falta uno de esos meses, no generar la alerta; no completar meses ausentes con gasto cero.
- Los meses parciales al inicio o al final del rango pueden aparecer en la tabla si intersectan el rango seleccionado. El outcome de esos meses se calcula con los movimientos incluidos en el rango; su baseline usa los tres meses calendario completos anteriores al mes evaluado.
- Comparar el outcome de un mes parcial con el baseline de meses completos puede afectar al porcentaje de incremento; esta limitación debe quedar visible en la documentación.
- No generar alertas cuando la media de los tres períodos anteriores sea cero.
- El umbral es una proporción: `0.3` equivale a `30 %`. La interfaz debe explicarlo junto al input.
- Mostrar un estado vacío explícito cuando no haya alertas y un error propio de la tabla si falla la carga. El error no debe ocultar los gráficos ni los indicadores existentes.
- Evitar que respuestas de solicitudes anteriores sustituyan los resultados del umbral o rango más recientes.
- Reutilizar componentes y tipos existentes siempre que sea posible.
- Mantener pendiente la confirmación de moneda. `formatCurrency` presenta actualmente USD en formato `en-US`; el modelo de movimientos no declara moneda. No cambiar el formato global ni asumir otra moneda.

## Comportamiento de alertas

Para cada período mensual candidato:

1. Determinar si el período intersecta el rango de fechas activo. Si no hay rango, se consideran todos los períodos disponibles.
2. Calcular el outcome registrado con los movimientos pertenecientes a ese período y, si es parcial, incluidos por el rango seleccionado.
3. Obtener los outcomes de los tres meses calendario inmediatamente anteriores, completos y con datos válidos. No aplicarles el límite inicial del rango; son necesarios para el baseline.
4. Si falta cualquiera de esos meses, no generar la alerta. Un mes ausente no equivale a cero.
5. Calcular la media aritmética de esos tres outcomes. Si la media es cero, no generar alerta.
6. Calcular el incremento como `(outcome del período - media de los tres meses anteriores) / media de los tres meses anteriores`.
7. Generar una alerta si el incremento es estrictamente superior al umbral seleccionado.

El incremento se maneja como proporción para la comparación con el umbral y se presenta como porcentaje multiplicándolo por 100. La respuesta de alertas se ordena por período ascendente, siguiendo el orden temporal del resumen mensual.

## Datos y presentación

La respuesta de `GET /api/metrics/alerts` contiene los campos existentes:

| Columna | Campo API | Presentación |
| --- | --- | --- |
| Período | `period` | `YYYY-MM` |
| Outcome registrado | `outcome_total` | Usar `formatCurrency` sin cambiar su formato global |
| Media de los tres meses anteriores | `baseline_average` | Usar `formatCurrency` sin cambiar su formato global |
| Incremento porcentual | `increase_ratio` | Multiplicar por 100 y mostrar como porcentaje |

El helper `formatCurrency` de `frontend/src/lib/financial-utils.ts` usa USD, configuración regional `en-US` y no muestra decimales. `FinancialMovement` solo define un importe numérico y no identifica moneda. Confirmar la moneda real sigue pendiente; hasta entonces, documentar que la visualización hereda el formato actual sin inferir que USD sea la moneda de origen.

## Contrato de API

### Comportamiento actual

- Existe `GET /api/metrics/alerts`; su respuesta es una lista con `period`, `outcome_total`, `baseline_average` e `increase_ratio`.
- Acepta `threshold` numérico con default `0.3` y mínimo `0`, `group_by` (`day`, `week`, `month`) con default `month`, fechas opcionales y `business_type` opcional.
- El algoritmo actual promedia todos los períodos anteriores disponibles, no exactamente los tres anteriores. No genera alerta si la media no es mayor que cero y compara usando `increase_ratio > threshold`.
- La ruta actual filtra por fecha antes de agrupar, por lo que no conserva movimientos anteriores al inicio del rango para un baseline histórico.
- El código y el OpenAPI adjunto describen estos contratos; las respuestas de alertas no se verificaron en vivo. Consultar [verification.md](../../verification.md).

### Cambios propuestos, aún no implementados

- Limitar `threshold` a `0.01`–`1.0`, conservando `0.3` como default, y actualizar el OpenAPI.
- Cambiar el cálculo para exigir los tres meses calendario previos con datos válidos, sin imputar meses ausentes como cero.
- Conservar el historial requerido para el baseline y devolver alertas solo de períodos que intersecten el rango seleccionado.
- Mantener la respuesta actual de cuatro campos salvo que una necesidad adicional se confirme durante la implementación. Los cambios de cálculo y parámetros son futuros; no forman parte del contrato actual.
- Aplicar estos cambios solo a la ruta de alertas según el alcance acordado.

## Cambios previstos

### Frontend

- Integrar la sección de alertas en `frontend/src/App.tsx`, debajo de los gráficos.
- Añadir el input numérico con default `0.3`, límites `0.01` y `1.0`, y la explicación de proporción.
- Reutilizar `Card` de `frontend/src/components/ui/card.tsx` si resulta apropiado para la sección. No existe actualmente un componente de tabla ni una interfaz de alertas en `frontend/src/lib/financial-types.ts`; añadir el tipo correspondiente y la presentación de la tabla.
- Solicitar alertas con el umbral y las fechas activas del dashboard. Asegurar que solo la respuesta de la selección más reciente actualice la tabla.
- Gestionar carga, error y estado vacío dentro de la sección, sin reemplazar los estados de los KPIs o gráficos.
- Reutilizar `formatCurrency` para los importes mientras la confirmación de moneda siga pendiente.

### Backend

- Actualizar la validación del parámetro `threshold` y el esquema OpenAPI para el rango requerido.
- Modificar el cálculo de alertas para exigir los tres meses previos completos y válidos, no asumir gasto cero para meses ausentes y conservar la regla de baseline cero.
- Asegurar que los meses de salida intersecten el rango activo mientras los tres meses anteriores necesarios sigan disponibles para el cálculo.
- Mantener la respuesta existente de `MetricsAlert`, salvo que la implementación revele una necesidad contractual no cubierta por sus cuatro campos.

## Verificación

- Verificar que el default del umbral sea `0.3`, que `0.01` y `1.0` sean válidos y que valores fuera del intervalo se rechacen.
- Verificar el incremento como proporción, la comparación estricta contra el umbral y la presentación del ratio como porcentaje.
- Verificar la media de exactamente tres meses completos inmediatamente anteriores y que la ventana avance correctamente entre meses.
- Verificar que un período sin datos entre los tres meses previos impida generar la alerta y no se impute como cero.
- Verificar que un período presente cuyo outcome registrado sea cero se procese como dato disponible y que un baseline de cero no genere alerta.
- Verificar alertas para meses parciales en los extremos del rango, con outcome limitado al rango y baseline calculado con meses completos anteriores. Documentar que la comparación de períodos parciales con completos puede afectar al porcentaje.
- Verificar que solo se devuelven alertas de períodos que intersectan el rango, manteniendo los meses previos necesarios para el baseline.
- Verificar respuesta vacía, error de carga aislado de la tabla y respuestas concurrentes con distintos rangos o umbrales.
- Verificar el formato de período `YYYY-MM` y el uso del helper `formatCurrency`, dejando constancia de que la moneda del dataset no está declarada.