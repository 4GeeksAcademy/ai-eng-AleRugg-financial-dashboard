# Filtro de rango de fechas del dashboard

## Objetivo

Permitir que el equipo de finanzas filtre todos los datos del dashboard principal por un rango opcional de fechas.

## Interfaz

- Mostrar dos inputs nativos de fecha en la parte superior del dashboard: fecha de inicio y fecha de fin.
- Aplicar el filtro automáticamente al cambiar cualquiera de las fechas.
- Aceptar la presentación localizada propia del input nativo. Los valores enviados a la API deben usar `YYYY-MM-DD`.
- Mostrar cerca de los inputs el rango disponible obtenido de facets, en formato legible `DD/MM/YYYY`.
- El rango disponible es informativo: no debe impedir seleccionar fechas anteriores o posteriores.

## Aplicación del filtro

- Ambos inputs son opcionales.
- Si ambos están vacíos, omitir los dos parámetros y mostrar todos los movimientos.
- Si solo uno tiene valor, enviar únicamente ese límite.
- Si ambos tienen valor, enviar `start_date` y `end_date`.
- Los límites son inclusivos: la API incluye movimientos del día inicial y del día final.
- Calcular los KPIs y los gráficos desde la misma respuesta filtrada de `GET /api/metrics`.
- Mostrar únicamente resultados correspondientes al rango seleccionado más recientemente. Una respuesta tardía de una solicitud anterior no debe reemplazar los datos actuales.
- Si una respuesta válida no contiene movimientos, mantener el comportamiento existente: los KPIs se calculan como cero y los gráficos muestran su estado sin datos.

## Rango invertido

Cuando ambas fechas están informadas y la fecha de inicio es posterior a la fecha de fin:

- No enviar la petición desde el frontend.
- Mostrar el mensaje: «La fecha de inicio no puede ser posterior a la fecha de fin».
- Conservar los últimos datos válidos mientras el usuario corrige las fechas.
- Validar también el rango en el backend, exclusivamente en `GET /api/metrics`. Esta validación no se extiende a otros endpoints.
- Responder con HTTP `422` y la estructura estándar de validación de FastAPI. Identificar el error con `type: "INVALID_DATE_RANGE"` y usar el mensaje anterior en `msg`.

Ejemplo del elemento de error dentro de `detail`:

```json
{
  "loc": ["query", "end_date"],
  "msg": "La fecha de inicio no puede ser posterior a la fecha de fin",
  "type": "INVALID_DATE_RANGE"
}
```

La igualdad de las fechas de inicio y fin es válida.

## Rango disponible y facets

- Consultar `GET /api/metrics/facets` para obtener `min_date` y `max_date` del conjunto completo disponible, independientemente del filtro activo.
- Cuando hay datos, mostrar ambas fechas como `DD/MM/YYYY`.
- Si no hay movimientos, devolver las mismas claves con `min_date: null` y `max_date: null`, y listas de opciones vacías.
- Si falla la petición de facets, mantener disponible el dashboard cuando las métricas carguen correctamente, mostrar un aviso y permitir reintentar la carga de facets sin bloquear ni reiniciar la carga de métricas.

## Contrato de API

### Comportamiento actual

- `GET /api/metrics` admite `start_date` y `end_date` opcionales con formato de fecha ISO `YYYY-MM-DD`.
- El filtrado actual incluye los dos extremos: `create_date >= start_date` y `create_date <= end_date`.
- El modelo actual de `GET /api/metrics/facets` requiere `min_date` y `max_date` como fechas no anulables. `build_metrics_facets` accede al primer y último movimiento, por lo que no maneja una lista vacía.
- La revisión del código y el OpenAPI adjunto confirman el contrato descrito arriba. Las respuestas actuales de estos endpoints no se verificaron en vivo; consultar [verification.md](../../verification.md).

### Cambios propuestos, aún no implementados

- Añadir validación de rango invertido solo a `GET /api/metrics`. Rechazar `start_date > end_date` con HTTP `422` y documentar la respuesta en OpenAPI. El endpoint y el backend actuales no realizan esa validación.
- Permitir `null` en `min_date` y `max_date` de facets cuando el conjunto esté vacío; conservar las claves y actualizar el modelo Pydantic, OpenAPI, tipos cliente y pruebas. El contrato actual no permite esos valores nulos.

## Reglas de fechas

- Mantener las fechas de API en formato ISO `YYYY-MM-DD`.
- Tratar estas cadenas como fechas de calendario. No convertirlas a fechas locales de una forma que pueda desplazar el día o el mes al formatear o agrupar.
- La presentación `DD/MM/YYYY` aplica al rango de referencia; la visualización de los inputs nativos puede seguir la localización del navegador.

## Verificación

- Verificar fechas parciales, ambos límites vacíos, rango válido inclusivo y fechas fuera del rango de referencia.
- Verificar rango invertido: no se hace petición frontend, se conservan los últimos datos válidos y el backend responde `422` con `type` y `msg` acordados.
- Verificar dataset vacío en facets: respuesta estable con listas vacías y fechas nulas.
- Verificar fallo de facets con métricas disponibles, aviso visible y reintento de facets.
- Verificar cambios rápidos de fecha: solo los resultados del rango más reciente actualizan el dashboard.
- Comprobar la API directamente y a través del proxy de Vite antes de considerar validado el flujo integrado.