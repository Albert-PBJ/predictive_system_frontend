// Capa de datos de estadísticas descriptivas (apps/analytics → /stats/*).
// Usa la instancia `api` compartida (token + refresh resueltos). El panel de Inicio
// (`dashboard`) es accesible a todo el personal; el resto requiere Gerente/Admin.

import { api } from "./api";

// --- Tipos compartidos ---
export interface StateCount {
  state: string;
  count: number;
}

export interface MonthlySalesPoint {
  period: string;
  label: string;
  revenue: number;
  count: number;
  profit?: number; // solo en /stats/sales (no en el panel de Inicio)
}

export interface SalesByType {
  type: string;
  label: string;
  count: number;
  revenue: number;
  profit?: number;
}

export interface RecentSale {
  id: number;
  date: string;
  customer: string;
  type: string;
  type_label: string;
  total_usd: number;
  status: string;
  status_label: string;
}

// --- Panel de Inicio ---
export interface DashboardStats {
  reference_month: { period: string; label: string };
  kpis: {
    customers_total: number;
    customers_active: number;
    customers_active_growth_pct: number | null;
    products_active: number;
    revenue_month: number;
    revenue_prev_month: number;
    revenue_growth_pct: number | null;
    sales_count_month: number;
    sales_count_prev_month: number;
    sales_count_growth_pct: number | null;
    target_month: number;
    target_pct: number;
  };
  monthly_sales: MonthlySalesPoint[];
  sales_by_type: SalesByType[];
  customers_by_state: StateCount[];
  recent_sales: RecentSale[];
}

// --- Panel de Inicio ejecutivo (máquina del tiempo) ---
// Reemplaza al panel anterior. Las claves marcadas "(sensible)" solo llegan para
// Gerente/Admin; el resto del personal recibe la versión operativa sin rentabilidad.

export interface DateRange {
  from: string;
  to: string;
}

export interface ExecKpis {
  revenue: number;
  revenue_delta_pct: number | null;
  sales_count: number;
  sales_count_delta_pct: number | null;
  avg_ticket: number;
  avg_ticket_delta_pct: number | null;
  units_sold: number;
  units_delta_pct: number | null;
  active_customers: number;
  active_customers_delta_pct: number | null;
  new_customers: number;
  quotes_issued: number;
  conversion_rate: number | null;
  retention_pct: number | null;
  // sensibles
  profit?: number;
  profit_delta_pct?: number | null;
  margin_pct?: number | null;
  margin_delta_pts?: number | null;
  discount?: number;
}

export interface HealthComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface HealthIndex {
  score: number;
  status: "good" | "warn" | "bad";
  components: HealthComponent[];
}

export interface ExecMonthlyPoint {
  period: string;
  label: string;
  revenue: number;
  count: number;
  profit?: number;
}

export interface ExecTypeMonth {
  period: string;
  label: string;
  retail: number;
  institutional: number;
}

export interface ExecTypeSplit {
  type: string;
  label: string;
  revenue: number;
  count: number;
  share_pct: number;
}

export interface ExecProductRow {
  product_id: number;
  name: string;
  sku: string | null;
  category: string;
  units: number;
  revenue: number;
}

export interface ExecCustomerRow {
  customer_id: number;
  name: string;
  type: string;
  state: string;
  revenue: number;
  orders: number;
  last_purchase?: string | null;
}

export interface NoDemandRow {
  product_id: number;
  name: string;
  sku: string | null;
  category: string;
  stock: number;
  retail_value: number;
  cost_value?: number;
}

export interface InventoryHealth {
  active_products: number;
  units_in_stock: number;
  ok_stock: number;
  low_stock: number;
  out_of_stock: number;
  inventory_retail_usd: number;
  inventory_cost_usd?: number;
}

export interface RateSeriesPoint {
  period: string;
  label: string;
  bcv: number | null;
  parallel: number | null;
}

export interface ExchangeRateBlock {
  start_bcv: number;
  end_bcv: number;
  start_parallel: number;
  end_parallel: number;
  bcv_change_pct: number | null;
  parallel_change_pct: number | null;
  series: RateSeriesPoint[];
}

export interface DashboardAlert {
  id: number;
  type: string;
  type_label: string;
  severity: string;
  severity_label: string;
  title: string;
  message: string;
  created_at: string;
}

export interface PositioningRow {
  category: string;
  own_avg: number | null;
  comp_min: number;
  comp_avg: number;
  comp_max: number;
  comp_median: number;
  n_obs: number;
  position: string | null;
  percentile: number | null;
}

export interface CompetitiveBlock {
  positioning: PositioningRow[];
  price_score: number | null;
}

export interface ModelHealthRow {
  model_type: string;
  model_type_display: string;
  r2: number | null;
  rmse: number | null;
  mae: number | null;
  accuracy: number | null;
  trained_at: string | null;
}

export interface ExecutiveDashboard {
  range: {
    from: string;
    to: string;
    from_label: string;
    to_label: string;
    months: number;
    data_from: string;
    data_to: string;
  };
  narrative: string[];
  kpis: ExecKpis;
  health_index?: HealthIndex | null;
  monthly: ExecMonthlyPoint[];
  monthly_by_type: ExecTypeMonth[];
  type_split: ExecTypeSplit[];
  revenue_by_category: { category: string; revenue: number }[];
  top_products: ExecProductRow[];
  top_customers: ExecCustomerRow[];
  no_demand: NoDemandRow[];
  no_demand_count: number;
  at_risk: ExecCustomerRow[];
  inventory_health: InventoryHealth;
  exchange_rate: ExchangeRateBlock | null;
  competitive?: CompetitiveBlock | null;
  alerts: DashboardAlert[];
  model_health?: ModelHealthRow[] | null;
  customers_by_state: StateCount[];
  recent_sales: RecentSale[];
}

// --- Clientes ---
export interface CustomerRankRow {
  customer_id: number;
  name: string;
  type: string;
  state: string;
  revenue: number;
  orders: number;
  last_purchase: string | null;
}

export interface CustomerStats {
  by_type: { type: string; label: string; count: number }[];
  by_state: StateCount[];
  active_split: { key: string; label: string; count: number }[];
  totals: { total: number; active: number; prospects: number; with_purchases: number };
  top_by_revenue: CustomerRankRow[];
  top_by_orders: CustomerRankRow[];
  at_risk: CustomerRankRow[];
}

// --- Productos ---
export interface ProductRankRow {
  product_id: number;
  name: string;
  sku: string | null;
  category: string;
  units: number;
  revenue: number;
}

export interface SlowMover {
  product_id: number;
  name: string;
  sku: string | null;
  category: string;
  stock: number;
}

export interface ProductStats {
  by_category: { category: string; count: number }[];
  by_material: { material: string; label: string; count: number }[];
  active_split: { key: string; label: string; count: number }[];
  stock_status: { key: string; label: string; count: number }[];
  totals: {
    active: number;
    inactive: number;
    units_in_stock: number;
    inventory_cost_usd: number;
    inventory_retail_usd: number;
    no_sales_count: number;
  };
  top_by_units: ProductRankRow[];
  top_by_revenue: ProductRankRow[];
  slow_movers: SlowMover[];
}

// --- Ventas ---
export interface SellerRankRow {
  seller_id: number;
  name: string;
  revenue: number;
  profit: number;
  count: number;
}

export interface SalesStats {
  by_type: SalesByType[];
  monthly: MonthlySalesPoint[];
  monthly_by_type: { period: string; label: string; retail: number; institutional: number }[];
  revenue_by_category: { category: string; revenue: number }[];
  top_sellers: SellerRankRow[];
  totals: {
    revenue: number;
    profit: number;
    discount: number;
    count: number;
    avg_ticket: number;
    margin_pct: number | null;
  };
}

// --- Presupuestos ---
export interface QuoteRankRow {
  id: number;
  quote_number: string;
  customer: string;
  total_usd: number;
  status: string;
  status_label: string;
  issued_date: string | null;
}

export interface QuoteStats {
  by_status: { status: string; label: string; count: number; value: number }[];
  monthly: { period: string; label: string; issued: number; converted: number }[];
  extras: { key: string; label: string; count: number }[];
  totals: {
    total: number;
    converted: number;
    rejected: number;
    conversion_rate: number | null;
    win_rate: number | null;
    open_count: number;
    pipeline_value: number;
  };
  top_quotes: QuoteRankRow[];
}

export const statsService = {
  // Panel de Inicio ejecutivo. `range` (Desde/Hasta) recalcula todo el panel; si se
  // omite, el backend usa los últimos 12 meses.
  async dashboard(range?: Partial<DateRange>): Promise<ExecutiveDashboard> {
    const params: Record<string, string> = {};
    if (range?.from) params.from = range.from;
    if (range?.to) params.to = range.to;
    const { data } = await api.get<ExecutiveDashboard>("/analytics/stats/dashboard", { params });
    return data;
  },
  async customers(): Promise<CustomerStats> {
    const { data } = await api.get<CustomerStats>("/analytics/stats/customers");
    return data;
  },
  async products(): Promise<ProductStats> {
    const { data } = await api.get<ProductStats>("/analytics/stats/products");
    return data;
  },
  async sales(): Promise<SalesStats> {
    const { data } = await api.get<SalesStats>("/analytics/stats/sales");
    return data;
  },
  async quotes(): Promise<QuoteStats> {
    const { data } = await api.get<QuoteStats>("/analytics/stats/quotes");
    return data;
  },
};
