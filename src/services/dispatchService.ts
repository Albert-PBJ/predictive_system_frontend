import { api } from "./api";
import type { Paginated } from "./types";

// Capa de datos de órdenes de despacho (apps/sales → /dispatch-orders/). Una orden
// de despacho es el documento de control de entrega de una venta: NO mueve inventario
// (el stock ya se descontó al vender), solo lista la mercancía a entregar, con su
// número correlativo (OD-DDMMYYYY-N) y un estado (pendiente → despachada → entregada).

export interface DispatchOrderItem {
  id: number;
  product: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
}

export interface DispatchOrder {
  id: number;
  order_number: string;
  sale: number;
  customer_name: string;
  customer_rif: string | null;
  sale_date: string;
  seller_name: string;
  status: string;
  status_display: string;
  dispatch_date: string | null;
  delivery_address: string;
  carrier: string;
  received_by: string;
  notes: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  items: DispatchOrderItem[];
}

export interface NewDispatchOrderItem {
  product: number;
  quantity: number;
}

export interface NewDispatchOrder {
  sale: number;
  dispatch_date?: string | null;
  delivery_address?: string;
  carrier?: string;
  notes?: string;
  status?: string;
  items?: NewDispatchOrderItem[];
}

export interface DispatchStatusUpdate {
  status?: string;
  dispatch_date?: string | null;
  carrier?: string;
  received_by?: string;
  notes?: string;
}

export interface DispatchListParams {
  search?: string;
  status?: string;
  sale?: number;
  page?: number;
  page_size?: number;
}

export const dispatchService = {
  async list(params: DispatchListParams = {}): Promise<Paginated<DispatchOrder>> {
    const { data } = await api.get<Paginated<DispatchOrder>>("/dispatch-orders/", { params });
    return data;
  },

  async retrieve(id: number): Promise<DispatchOrder> {
    const { data } = await api.get<DispatchOrder>(`/dispatch-orders/${id}/`);
    return data;
  },

  async create(payload: NewDispatchOrder): Promise<DispatchOrder> {
    const { data } = await api.post<DispatchOrder>("/dispatch-orders/", payload);
    return data;
  },

  // Actualiza estado / datos de entrega. Nota la barra final de la acción DRF.
  async updateStatus(id: number, payload: DispatchStatusUpdate): Promise<DispatchOrder> {
    const { data } = await api.post<DispatchOrder>(`/dispatch-orders/${id}/estado/`, payload);
    return data;
  },
};

// Estados de la orden (deben coincidir con sales.DispatchOrder.StatusChoices).
export const DISPATCH_STATUSES = [
  { value: "PEN", label: "Pendiente" },
  { value: "PREP", label: "En preparación" },
  { value: "DESP", label: "Despachada" },
  { value: "ENT", label: "Entregada" },
  { value: "ANU", label: "Anulada" },
];

export function dispatchStatusColor(
  status: string,
): "success" | "warning" | "error" | "info" | "light" {
  if (status === "ENT") return "success";
  if (status === "DESP") return "info";
  if (status === "PREP" || status === "PEN") return "warning";
  if (status === "ANU") return "error";
  return "light";
}
