import type {
  BusinessType,
  OperationType,
} from "../src/lib/financial-types";

/** Filtros de fechas opcionales compartidos por endpoints de métricas. */
export interface DateRangeFilter {
  /**
   * Fecha inicial inclusiva en formato de calendario `YYYY-MM-DD`.
   * Si se omite, no se aplica límite inicial.
   */
  start_date?: string;

  /**
   * Fecha final inclusiva en formato de calendario `YYYY-MM-DD`.
   * Si se omite, no se aplica límite final.
   */
  end_date?: string;
}

/** Parámetros de consulta actuales para GET /api/metrics/alerts. */
export interface AlertsParams extends DateRangeFilter {
  /**
   * Incremento expresado como proporción. La API actual usa `0.3` por defecto,
   * admite valores desde `0` y no define un máximo. La especificación propone
   * limitarlo a `0.01–1.0` en un cambio futuro.
   */
  threshold?: number;
}

/** Parámetros de consulta actuales para GET /api/metrics/categories/top. */
export interface TopCategoriesParam extends DateRangeFilter {
  /**
   * Tipo de operación: `income` o `outcome`. La API usa `outcome` por defecto;
   * la comparativa de ingresos debe enviar `income` explícitamente.
   */
  operation_type?: OperationType;

  /**
   * Cantidad de categorías solicitadas. La API usa `5` por defecto y admite
   * enteros entre `1` y `20`.
   */
  limit?: number;

  /**
   * Filtro opcional por línea de negocio: `B2B` o `B2C`.
   * La API no declara un valor por defecto; si se omite, no filtra por grupo.
   */
  business_type?: BusinessType;
}
