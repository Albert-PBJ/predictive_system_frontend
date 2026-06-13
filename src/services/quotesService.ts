import { api } from "./api";
import type { Paginated } from "./types";

// Capa de datos de presupuestos (apps/sales → /quotes/). Usa la instancia `api`
// compartida (token + refresh resueltos). Un presupuesto es una oferta de precios:
// NO toca inventario ni calcula utilidad; lleva IVA (16% por defecto) y un número
// correlativo por día (DDMMYYYY-N).

export interface QuoteItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price_usd: string;
  unit_price_ves: string | null;
  line_total_usd: string;
  line_total_ves: string | null;
}

export interface Quote {
  id: number;
  quote_number: string;
  customer: number;
  customer_name: string;
  customer_rif: string | null;
  seller: number | null;
  seller_name: string;
  issued_date: string;
  expiry_date: string | null;
  bcv_rate: string | null;
  parallel_rate: string | null;
  includes_installation: boolean;
  includes_delivery: boolean;
  subtotal_usd: string;
  subtotal_ves: string | null;
  iva_rate: string;
  iva_amount_usd: string;
  total_usd: string;
  total_ves: string | null;
  status: string;
  status_display: string;
  converted_to_sale: number | null;
  items: QuoteItem[];
  created_at: string;
}

export interface NewQuoteItem {
  product: number;
  quantity: number;
  // Precio unitario opcional: si se omite, el backend usa el precio de venta del producto.
  unit_price_usd?: string | number;
}

export interface NewQuote {
  customer: number;
  seller?: number;
  issued_date?: string;
  expiry_date?: string | null;
  iva_rate?: string | number;
  includes_installation?: boolean;
  includes_delivery?: boolean;
  status?: string;
  items: NewQuoteItem[];
}

export interface QuoteListParams {
  search?: string;
  status?: string;
  customer?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export const quotesService = {
  async list(params: QuoteListParams = {}): Promise<Paginated<Quote>> {
    const { data } = await api.get<Paginated<Quote>>("/quotes/", { params });
    return data;
  },

  async retrieve(id: number): Promise<Quote> {
    const { data } = await api.get<Quote>(`/quotes/${id}/`);
    return data;
  },

  async create(payload: NewQuote): Promise<Quote> {
    const { data } = await api.post<Quote>("/quotes/", payload);
    return data;
  },
};

// Estados al crear (deben coincidir con sales.Quote.StatusChoices, sin CONVERTED que
// lo fija el sistema al convertir el presupuesto en venta).
export const QUOTE_STATUSES = [
  { value: "DRA", label: "Borrador" },
  { value: "SEN", label: "Enviado" },
  { value: "APR", label: "Aprobado" },
  { value: "REJ", label: "Rechazado" },
];

// Filtros del historial (incluye el estado "Convertido a Venta").
export const QUOTE_STATUS_FILTERS = [
  ...QUOTE_STATUSES,
  { value: "CON", label: "Convertido a Venta" },
];
