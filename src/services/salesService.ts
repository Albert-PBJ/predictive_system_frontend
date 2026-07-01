import { api } from "./api";
import type { Paginated } from "./types";

export interface SaleItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_list_price_usd: string;
  discount_pct: string;
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
  customer_rif: string | null;
  customer_address: string;
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
  total_discount_usd: string;
  total_sale_ves: string | null;
  // Desglose de IVA (la base imponible es total_sale_usd; el total a pagar, con IVA).
  iva_rate: string;
  iva_amount_usd: string;
  total_with_iva_usd: string;
  total_with_iva_ves: string | null;
  commission_usd: string;
  bcv_rate: string | null;
  parallel_rate: string | null;
  // Facturación fiscal (opcional; se completa con la acción "Facturar").
  invoice_number: string | null;
  control_number: string | null;
  invoice_date: string | null;
  invoice_file_url: string | null;
  is_invoiced: boolean;
  // Instancias relacionadas del flujo (para navegar entre ellas).
  source_quote: { id: number; quote_number: string } | null;
  dispatch_orders: { id: number; order_number: string; status: string; status_display: string }[];
  notes: string;
  items: SaleItem[];
  created_at: string;
}

export interface InvoiceSuggestion {
  invoice_number: string;
  control_number: string;
}

export interface InvoicePayload {
  invoice_number: string;
  control_number: string;
  invoice_date?: string | null;
  file?: File | null;
}

export interface NewSaleItem {
  product: number;
  quantity: number;
  discount_pct?: string | number;
  unit_sale_price_usd?: string | number;
}

export interface NewSale {
  customer: number;
  seller?: number;
  sale_date?: string;
  sale_type?: string;
  status?: string;
  notes?: string;
  iva_rate?: string | number;
  // Presupuesto relacionado (opcional): enlaza la venta al presupuesto y lo marca convertido.
  quote?: number;
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

  // Siguiente número correlativo sugerido de factura y de control.
  async nextInvoiceNumbers(): Promise<InvoiceSuggestion> {
    const { data } = await api.get<InvoiceSuggestion>("/sales/siguiente-factura/");
    return data;
  },

  // Factura una venta (datos fiscales + adjunto opcional). Va como multipart porque
  // puede llevar el archivo de la factura (PDF/imagen). El `Content-Type` se fuerza a
  // multipart: la instancia `api` trae "application/json" por defecto y, con ese
  // encabezado, axios serializaría el FormData a JSON (el archivo llegaría como texto y
  // el backend respondería "The submitted data was not a file"). Al ponerlo en
  // multipart, axios deja el FormData intacto y el navegador añade el boundary.
  async invoiceSale(id: number, payload: InvoicePayload): Promise<Sale> {
    const fd = new FormData();
    fd.append("invoice_number", payload.invoice_number);
    fd.append("control_number", payload.control_number);
    if (payload.invoice_date) fd.append("invoice_date", payload.invoice_date);
    if (payload.file) fd.append("invoice_file", payload.file);
    const { data } = await api.post<Sale>(`/sales/${id}/facturar/`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
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
