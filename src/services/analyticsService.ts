// Capa de datos del módulo predictivo (apps/analytics). Usa la instancia `api`
// compartida (token + refresh ya resueltos). Todos los endpoints requieren rol
// Gerente o Administrador en el backend.

import { api } from "./api";

// --- Contrato uniforme de los pronósticos de serie temporal ---
export interface ForecastPoint {
  period: string;
  label: string;
  value: number;
  lower?: number;
  upper?: number;
  margin?: number; // utilidad: % de margen
  value_ves?: number | null; // precio: equivalente en Bs
  demand?: number; // inventario: demanda del mes
  features?: Record<string, number>;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ModelInfo {
  key?: string;
  label?: string;
  library?: string;
  r2?: number | null;
  rmse?: number | null;
  mae?: number | null;
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  n_train?: number;
  n_holdout?: number;
  trained_at?: string;
  hyperparameters?: Record<string, unknown>;
  feature_importances?: FeatureImportance[];
  slope_usd_per_month?: number;
}

export interface DetailEntry {
  kind: "history" | "forecast";
  columns: string[];
  rows: (string | number | null)[][];
  summary?: Record<string, unknown>;
}

export type ValueKind = "int" | "usd" | "ves" | "rate" | "percent";

export interface ForecastResponse {
  target: string;
  title: string;
  subject: { product_id: number; product_name: string; sku: string | null } | null;
  unit: string;
  value_kind: ValueKind;
  model: ModelInfo | null;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  detail: Record<string, DetailEntry>;
  meta: Record<string, unknown>;
  sigma?: number | null;
}

export interface ForecastableProduct {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  stock: number;
  sale_price_usd: number;
  total_units_sold: number;
  n_sales: number;
}

// --- Conversión de presupuestos (clasificación) ---
export interface PipelineQuote {
  id: number;
  quote_number: string;
  customer: string;
  total_usd: number;
  probability: number;
  expected_usd: number;
  status: string;
}

export interface QuoteConversionResponse {
  target: "quote";
  title: string;
  unit: string;
  value_kind: ValueKind;
  model: ModelInfo;
  monthly_rate: { period: string; label: string; value: number; total: number; converted: number }[];
  historical_conversion_rate: number;
  pipeline: {
    open_count: number;
    expected_revenue_usd: number;
    total_value_usd: number;
    expected_rate_pct: number;
    quotes: PipelineQuote[];
  };
}

// --- Análisis de competencia (separado de los datos internos) ---
export interface CompetitorResponse {
  target: "competitor";
  title: string;
  categories: string[];
  filter: { category: string | null; product_id: number | null };
  positioning: {
    category: string;
    own_avg: number | null;
    comp_min: number;
    comp_avg: number;
    comp_max: number;
    comp_median: number;
    n_obs: number;
    position: "below" | "within" | "above" | null;
    percentile: number | null;
  }[];
  by_competitor: { competitor: string; avg_price_usd: number; n_obs: number; products: number }[];
  product_comparison: {
    product_id: number;
    product: string;
    own_price_usd: number | null;
    comp_min: number;
    comp_avg: number;
    comp_max: number;
    n_obs: number;
    position: "below" | "within" | "above" | null;
  }[];
  trend: { period: string; label: string; comp_avg: number; trend: number }[];
  observations: {
    competitor: string;
    product_name: string;
    category: string;
    price_usd: number;
    matched_product: string | null;
    in_stock: boolean | null;
    source: string;
    scraped_at: string;
  }[];
  model: ModelInfo | null;
  meta: { n_obs: number; n_competitors?: number };
}

// --- Panel resumen ---
export interface OverviewResponse {
  headlines: {
    next_revenue: ForecastPoint | null;
    revenue_model: ModelInfo | null;
    next_bcv: ForecastPoint | null;
    next_parallel: ForecastPoint | null;
    pipeline: QuoteConversionResponse["pipeline"] | null;
    quote_conversion_rate: number | null;
  };
  restock_alerts: {
    product_id: number;
    product_name: string | null;
    current_stock: number;
    reorder_point: number;
    suggested_reorder_qty: number;
    stockout_label: string | null;
    months_of_cover: number | null;
  }[];
  registry: {
    name: string;
    model_type: string;
    model_type_display: string;
    r2: number | null;
    rmse: number | null;
    mae: number | null;
    metrics: Record<string, unknown>;
    hyperparameters: Record<string, unknown>;
    trained_at: string | null;
  }[];
}

// --- Narrativa del reporte ejecutivo redactada por el LLM ---
// El backend recalcula el panel para el rango y le pide al modelo la prosa del
// reporte. Si el LLM no está configurado o falla, `available` viene en false y el
// frontend cae a la síntesis determinista (components/report/reportContent.ts).
export interface ReportNarrativeRisk {
  severity: "high" | "medium" | "low";
  title: string;
  text: string;
}

export interface ReportNarrativeAction {
  title: string;
  text: string;
}

export interface ReportNarrative {
  available: boolean;
  reason?: string;
  generated_by?: string;
  situation?: string;
  highlights?: string[];
  risks?: ReportNarrativeRisk[];
  estimations_intro?: string;
  actions?: ReportNarrativeAction[];
  closing?: string;
}

export const analyticsService = {
  async overview(): Promise<OverviewResponse> {
    const { data } = await api.get<OverviewResponse>("/analytics/overview");
    return data;
  },
  // Narrativa del reporte para el rango (Desde/Hasta). Accesible a todo el personal
  // (IsViewer); las cifras sensibles solo se usan para Gerente/Admin en el backend.
  async reportNarrative(range?: { from?: string; to?: string }): Promise<ReportNarrative> {
    const params: Record<string, string> = {};
    if (range?.from) params.from = range.from;
    if (range?.to) params.to = range.to;
    const { data } = await api.get<ReportNarrative>("/analytics/report-narrative", { params });
    return data;
  },
  async forecastableProducts(): Promise<ForecastableProduct[]> {
    const { data } = await api.get<{ results: ForecastableProduct[] }>("/analytics/forecastable-products");
    return data.results;
  },
  async demand(product: number, horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/demand", {
      params: { product, horizon },
    });
    return data;
  },
  async sales(metric: "revenue" | "count", horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/sales", {
      params: { metric, horizon },
    });
    return data;
  },
  async profit(horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/profit", { params: { horizon } });
    return data;
  },
  async exchangeRate(rate: "bcv" | "parallel", horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/exchange-rate", {
      params: { rate, horizon },
    });
    return data;
  },
  async productPrice(product: number, horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/product-price", {
      params: { product, horizon },
    });
    return data;
  },
  async inventory(product: number, horizon: number): Promise<ForecastResponse> {
    const { data } = await api.get<ForecastResponse>("/analytics/forecast/inventory", {
      params: { product, horizon },
    });
    return data;
  },
  async quoteConversion(): Promise<QuoteConversionResponse> {
    const { data } = await api.get<QuoteConversionResponse>("/analytics/forecast/quote-conversion");
    return data;
  },
  async competitors(category?: string, product?: number): Promise<CompetitorResponse> {
    const { data } = await api.get<CompetitorResponse>("/analytics/benchmark/competitors", {
      params: { category: category || undefined, product: product || undefined },
    });
    return data;
  },
};

export const HORIZON_OPTIONS = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
];
