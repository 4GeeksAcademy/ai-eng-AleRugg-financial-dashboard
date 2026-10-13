// Reutilizamos las listas permitidas de grupos, categorías y operaciones.
import type {
  BusinessType,
  Category,
  OperationType,
} from "../src/lib/financial-types";

// Catálogo y fechas disponibles que facets devuelve actualmente.
export interface FacetsResponse {
  operation_types: OperationType[];
  business_types: BusinessType[];
  categories: Category[];
  min_date: string;
  max_date: string;
}

// Propuesta futura: admite que no haya fechas y separa categorías por grupo.
export type ProposedFacetsResponse = Omit<
  FacetsResponse,
  "min_date" | "max_date"
> & {
  min_date: string | null;
  max_date: string | null;
  income_categories_by_business_type: Record<BusinessType, Category[]>;
};

// Una alerta: gasto del período, media previa e incremento observado.
export interface AlertEntry {
  period: string;
  outcome_total: number;
  baseline_average: number;
  increase_ratio: number;
}

export type AlertsResponse = AlertEntry[];

// Una categoría del ranking; B2B o B2C se indica al pedir los datos.
export interface CategoryEntry {
  category: Category;
  operation_type: OperationType;
  total_amount: number;
}

export type TopCategoriesResponse = CategoryEntry[];
