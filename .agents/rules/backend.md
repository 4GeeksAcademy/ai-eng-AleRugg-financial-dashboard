# Reglas de backend

## Objetivo
Preservar la reproducibilidad de los datos simulados, la semántica de las fechas y la forma validada de las respuestas de la API.

## Justificación
En `backend/app/routes.py`, `generate_mock_movements(seed=42)` llama a `random.seed(seed)` y las funciones de generación usan el generador global. Esto cambia el estado aleatorio compartido del proceso. Las fechas son valores de calendario y los modelos Pydantic, los valores `Literal`, las respuestas y los filtros se definen en `routes.py`. `backend/tests/test_routes.py` verifica orden, filtros y campos de las rutas. El dashboard consume actualmente `GET /api/metrics`; los endpoints analíticos adicionales no son parte de su flujo de presentación.

## Reglas
- Para resultados reproducibles, crea un generador local con `random.Random(seed)` y pásalo a todas las funciones que generan movimientos; no cambies la semilla aleatoria global.
- Trata las fechas `YYYY-MM-DD` como fechas de calendario, sin desplazamientos por zona horaria al filtrar o agrupar.
- Conserva los modelos de respuesta Pydantic y los valores permitidos para tipos, categorías y agrupaciones. Mantén alineados los campos consumidos con `frontend/src/lib/financial-types.ts`.
- Mantén las respuestas ordenadas cronológicamente cuando el endpoint devuelve movimientos.
- Al cambiar rutas, filtros, campos o reglas de generación, añade o actualiza pruebas en `backend/tests/` para cubrir el contrato y sus límites. Incluye reproducibilidad y evita depender de un año fijo cuando la generación use la fecha actual.
- Distingue en la documentación los endpoints existentes de los que consume efectivamente el dashboard.

## Ejemplo correcto
Usa el generador local para todos los valores aleatorios de una generación:

```python
rng = random.Random(seed)
amount = round(rng.uniform(500, 9000), 2)
```

Pasa `rng` a `_build_movement` y usa sus métodos (`random`, `randint`, `choice`, `uniform`) en lugar del módulo global.

## Ejemplo incorrecto
Este patrón existente reinicia el generador global y deja que la generación comparta ese estado con el resto del proceso:

```python
if seed is not None:
    random.seed(seed)

amount = random.uniform(500, 9000)
```
