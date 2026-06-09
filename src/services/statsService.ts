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
  async dashboard(): Promise<DashboardStats> {
    const { data } = await api.get<DashboardStats>("/analytics/stats/dashboard");
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
