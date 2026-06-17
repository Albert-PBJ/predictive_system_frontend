// Capa de datos del módulo "Benchmarking Competitivo" (apps/analytics →
// /benchmarking/*). Usa la instancia `api` compartida (token + refresh resueltos).
// Ambos endpoints requieren rol Gerente o Administrador en el backend.

import { api } from "./api";
import type { DateRange } from "./statsService";
import type { ForecastPoint, ModelInfo } from "./analyticsService";

export interface BenchRange {
  from: string;
  to: string;
  from_label: string;
  to_label: string;
  months: number;
  data_from: string;
  data_to: string;
}

// --- Comparaciones (descriptivo) ---
export interface StateBench {
  state: string;
  competitors: number;
  observations: number;
}

export interface SourceBench {
  source: string;
  label: string;
  competitors: number;
  observations: number;
  obs_pct: number;
}

export interface CompetitorWithPromo {
  competitor: string;
  promotions: string[];
}

export interface PromoBreakdown {
  promotion: string;
  count: number;
}

export interface BenchPromotions {
  competitors_with_promo: CompetitorWithPromo[];
  breakdown: PromoBreakdown[];
  share_obs_pct: number;
  total_competitors: number;
}

export interface CompetitorRow {
  competitor: string;
  state: string;
  municipality: string;
  sources: string[];
  products: number;
  categories: number;
  observations: number;
  avg_price_usd: number;
  min_price_usd: number;
  max_price_usd: number;
  has_promo: boolean;
  matched: number;
  unmatched: number;
}

export interface CatalogCoverageRow {
  category: string;
  competitors: number;
  observations: number;
  own_products: number;
}

export interface UnmatchedProductRow {
  competitor: string;
  product_name: string;
  category: string;
  price_usd: number;
  source: string;
  source_label: string;
}

export interface PriceComparisonRow {
  product_id: number;
  product: string;
  own_price_usd: number | null;
  comp_min: number;
  comp_avg: number;
  comp_max: number;
  n_obs: number;
  n_competitors: number;
  position: "below" | "within" | "above" | null;
}

export interface PositioningRow {
  category: string;
  own_avg: number | null;
  comp_min: number;
  comp_avg: number;
  comp_max: number;
  comp_median: number;
  n_obs: number;
  position: "below" | "within" | "above" | null;
  percentile: number | null;
}

export interface ObservationRow {
  competitor: string;
  product_name: string;
  category: string;
  price_usd: number;
  source: string;
  source_label: string;
  in_stock: boolean | null;
  promotions: string | null;
  lead_time_days: number | null;
  matched_product: string | null;
  scraped_at: string;
}

export interface BenchComparison {
  range: BenchRange;
  narrative: string[];
  competitors: string[];
  selected_competitor: string;
  meta: {
    n_obs: number;
    n_competitors: number;
    n_products: number;
    n_with_promo: number;
    n_unmatched: number;
  };
  by_state: StateBench[];
  by_source: SourceBench[];
  promotions: BenchPromotions;
  by_competitor: CompetitorRow[];
  catalog_coverage: CatalogCoverageRow[];
  products_not_in_catalog: UnmatchedProductRow[];
  categories_not_covered: string[];
  price_comparison: PriceComparisonRow[];
  positioning: PositioningRow[];
  observations: ObservationRow[];
}

// --- Predicciones (pronóstico de mercado vs. nuestros precios) ---
export interface BenchChart {
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  model: ModelInfo;
  own_series: number[] | null; // alineado a [...history, ...forecast]
}

export interface CategoryForecast extends BenchChart {
  category: string;
  current_market: number;
  projected_market: number;
  current_own: number | null;
  projected_own: number | null;
  current_gap_pct: number | null;
  projected_gap_pct: number | null;
  verdict: { key: string; label: string };
}

export interface MatchedProduct {
  product_id: number;
  name: string;
  n_competitors: number;
  n_obs: number;
}

export interface BenchForecast {
  target: "competitor_forecast";
  title: string;
  range: BenchRange;
  narrative: string[];
  horizon: number;
  categories: string[];
  competitors: string[];
  selected_competitor: string;
  matched_products: MatchedProduct[];
  market_overall: BenchChart | null;
  by_category: CategoryForecast[];
  model: ModelInfo | null;
  meta: { n_obs?: number; n_competitors?: number; insufficient_data?: boolean };
}

// --- Comparación de precio por producto (competidor vs. interno) ---
export interface NamedSeries {
  label: string;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  model: ModelInfo;
}

export const ALL_COMPETITORS = "__all__";

export interface ProductForecast {
  product: { id: number; name: string; sku: string | null } | null;
  selected_competitor: string;
  competitors: string[];
  competitor_series: NamedSeries | null;
  own_series: NamedSeries | null;
  meta: { n_obs: number; n_competitors: number; insufficient_data?: boolean };
}

function rangeParams(range?: Partial<DateRange>): Record<string, string> {
  const params: Record<string, string> = {};
  if (range?.from) params.from = range.from;
  if (range?.to) params.to = range.to;
  return params;
}

// El competidor `__all__` (o vacío) significa "todos": no se manda al backend.
function competitorParam(competitor?: string): string | undefined {
  return competitor && competitor !== ALL_COMPETITORS ? competitor : undefined;
}

export const benchmarkingService = {
  // Comparaciones descriptivas para el rango (Desde/Hasta recalcula todo). `competitor`
  // acota todo el panel a uno; por defecto se agregan todos.
  async comparison(range?: Partial<DateRange>, competitor?: string): Promise<BenchComparison> {
    const { data } = await api.get<BenchComparison>("/analytics/benchmarking/comparison", {
      params: { ...rangeParams(range), competitor: competitorParam(competitor) },
    });
    return data;
  },
  // Pronóstico de mercado vs. nuestros precios. El rango define la ventana histórica;
  // el pronóstico la extiende `horizon` meses. `category` enfoca una categoría y
  // `competitor` acota el "mercado" a un único competidor (por defecto, todos).
  async forecast(
    range: Partial<DateRange> | undefined,
    horizon: number,
    category?: string,
    competitor?: string,
  ): Promise<BenchForecast> {
    const { data } = await api.get<BenchForecast>("/analytics/benchmarking/forecast", {
      params: {
        ...rangeParams(range),
        horizon,
        category: category || undefined,
        competitor: competitorParam(competitor),
      },
    });
    return data;
  },
  // Comparación de precio de UN producto: competidor (concreto o promedio de todos)
  // vs. nuestro precio interno, con histórico + pronóstico de ambas líneas.
  async productForecast(
    range: Partial<DateRange> | undefined,
    product: number,
    competitor: string,
    horizon: number,
  ): Promise<ProductForecast> {
    const { data } = await api.get<ProductForecast>("/analytics/benchmarking/product-forecast", {
      params: { ...rangeParams(range), product, competitor: competitor || undefined, horizon },
    });
    return data;
  },
};
