import { api } from "./api";
import type { Paginated } from "./types";

export interface StockRow {
  id: number;
  sku: string | null;
  name: string;
  full_name: string;
  category: number | null;
  category_name: string | null;
  stock: number;
  min_stock: number;
  low_stock: boolean;
  sale_price_usd: string;
  purchase_price_usd: string | null;
  average_cost_usd: string | null; // costo promedio ponderado móvil (CMV)
  is_active: boolean;
}

export interface StockResponse {
  count: number;
  low_stock_count: number;
  results: StockRow[];
}

export interface Movement {
  id: number;
  product: number;
  product_name: string;
  product_sku: string | null;
  movement_type: string;
  movement_type_display: string;
  quantity: number;
  unit_cost_usd: string | null; // costo unitario (compra en entradas; CMV en salidas)
  sale: number | null;
  reference: string;
  responsible: number | null;
  responsible_username: string | null;
  responsible_name: string | null;
  movement_date: string;
  notes: string;
  // Verificación por almacén: confirma que el cambio físico ocurrió (solo la marca
  // el encargado de inventario o el admin).
  verified: boolean;
  verified_by: number | null;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface NewMovement {
  product: number;
  movement_type: string;
  quantity: number; // delta con signo: positivo suma, negativo resta (solo AJU)
  unit_cost?: string; // costo unitario de compra (USD): en una entrada recalcula el promedio ponderado
  reference?: string;
  notes?: string;
  movement_date?: string;
}

export interface StockParams {
  search?: string;
  category?: number;
  low_stock?: boolean;
  is_active?: boolean;
}

export interface MovementListParams {
  product?: number;
  movement_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const inventoryService = {
  async getStock(params: StockParams = {}): Promise<StockResponse> {
    const { data } = await api.get<StockResponse>("/inventory/stock", { params });
    return data;
  },

  async getMovements(params: MovementListParams = {}): Promise<Paginated<Movement>> {
    const { data } = await api.get<Paginated<Movement>>("/inventory/movements/", { params });
    return data;
  },

  async createMovement(payload: NewMovement): Promise<Movement> {
    const { data } = await api.post<Movement>("/inventory/movements/", payload);
    return data;
  },

  // Marca (o desmarca) un movimiento como verificado por almacén. Solo el encargado
  // de inventario o el admin pueden hacerlo (lo aplica el backend). Nota la barra final.
  async verifyMovement(id: number, verified = true): Promise<Movement> {
    const { data } = await api.post<Movement>(`/inventory/movements/${id}/verificar/`, { verified });
    return data;
  },
};

// Tipos de movimiento que se pueden registrar manualmente (SAL lo genera la venta).
export const MANUAL_MOVEMENT_TYPES = [
  { value: "ENT", label: "Entrada (Compra/Reposición)" },
  { value: "AJU", label: "Ajuste" },
  { value: "DEV", label: "Devolución" },
];

// Todos los tipos (para los filtros del historial).
export const ALL_MOVEMENT_TYPES = [
  ...MANUAL_MOVEMENT_TYPES,
  { value: "SAL", label: "Salida (Venta)" },
];
