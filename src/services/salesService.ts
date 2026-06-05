import { api } from "./api";
import type { Paginated } from "./types";

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_sale_price_usd: string;
  unit_cost_price_usd: string;
  subtotal_sale_usd: string;
  subtotal_cost_usd: string;
  line_profit_usd: string;
}

export interface Sale {
  id: number;
  customer: number;
  customer_name: string;
  seller: number;
  seller_name: string;
  sale_date: string;
  sale_type: string;
  sale_type_display: string;
  status: string;
  status_display: string;
  total_sale_usd: string;
  total_cost_usd: string;
  total_profit_usd: string;
  total_sale_ves: string | null;
  commission_usd: string;
  bcv_rate: string | null;
  parallel_rate: string | null;
  notes: string;
  items: SaleItem[];
  created_at: string;
}

export interface NewSaleItem {
  product: number;
  quantity: number;
  unit_sale_price_usd?: string | number;
}

export interface NewSale {
  customer: number;
  seller?: number;
  sale_date?: string;
  sale_type?: string;
  status?: string;
  notes?: string;
  items: NewSaleItem[];
}

export interface SaleListParams {
  search?: string;
  status?: string;
  seller?: number;
  customer?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface LatestRate {
  date: string;
  bcv_rate: string;
  parallel_rate: string | null;
  effective_rate: string;
  source: string;
}

export const salesService = {
  async list(params: SaleListParams = {}): Promise<Paginated<Sale>> {
    const { data } = await api.get<Paginated<Sale>>("/sales/", { params });
    return data;
  },

  async retrieve(id: number): Promise<Sale> {
    const { data } = await api.get<Sale>(`/sales/${id}/`);
    return data;
  },

  async create(payload: NewSale): Promise<Sale> {
    const { data } = await api.post<Sale>("/sales/", payload);
    return data;
  },

  // Anula una venta (devuelve el stock). Solo gerente/admin. Nota la barra final.
  async voidSale(id: number): Promise<Sale> {
    const { data } = await api.post<Sale>(`/sales/${id}/anular/`);
    return data;
  },

  async getLatestRate(): Promise<LatestRate | null> {
    try {
      const { data } = await api.get<LatestRate>("/exchange-rate/latest");
      return data;
    } catch {
      // Sin tasa cargada: la venta se registra igual (sin previsualización en VES).
      return null;
    }
  },
};

export const SALE_TYPES = [
  { value: "RET", label: "Detal" },
  { value: "INST", label: "Proyecto Institucional" },
];

export const SALE_STATUSES = [
  { value: "COMP", label: "Completada" },
  { value: "PEN", label: "Pendiente" },
];

export const SALE_STATUS_FILTERS = [
  { value: "COMP", label: "Completada" },
  { value: "PEN", label: "Pendiente" },
  { value: "ANU", label: "Anulada" },
];
