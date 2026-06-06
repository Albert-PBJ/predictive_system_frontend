import { api } from "./api";
import type { ScraperSource } from "../context/ScraperContext";

// Las rutas de scrapers viven en /scrapers/ (no bajo /api/). Derivamos la raíz del
// backend desde la base de la API, igual que en ScraperContext / CollectedDataTable.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const SCRAPERS_ROOT = API_BASE.replace(/\/api\/?$/, "");

export interface MarketDataRow {
  id: number;
  competitor_name: string | null;
  product_name: string | null;
  category: string | null;
  price: string | null;
  currency: string | null;
  price_usd: string | null;
  matched_product: string | null;
  promotions: string | null;
  is_in_stock: boolean | null;
  state: string | null;
  municipality: string | null;
  url: string | null;
  scraped_at: string | null;
}

export interface DataResponse {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: MarketDataRow[];
  available_states: string[];
  available_municipalities: string[];
}

export interface RejectedRow {
  id: number;
  competitor_name: string | null;
  product_name: string | null;
  category: string | null;
  price: string | null;
  currency: string | null;
  url: string | null;
  rejection_reason: string;
  created_at: string | null;
}

export interface RejectedResponse {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: RejectedRow[];
}

// Campos editables a mano por el admin (espejo del serializer del backend).
export interface MarketDataEdit {
  product_name?: string | null;
  category?: string | null;
  price?: string | null;
  currency?: string | null;
  promotions?: string | null;
  is_in_stock?: boolean | null;
}

type Params = Record<string, string | number>;

export const scraperDataService = {
  async listData(source: ScraperSource, params: Params = {}): Promise<DataResponse> {
    const { data } = await api.get<DataResponse>(`${SCRAPERS_ROOT}/scrapers/${source}/data`, { params });
    return data;
  },

  async updateData(source: ScraperSource, id: number, payload: MarketDataEdit): Promise<MarketDataRow> {
    const { data } = await api.patch<MarketDataRow>(`${SCRAPERS_ROOT}/scrapers/${source}/data/${id}`, payload);
    return data;
  },

  async deleteData(source: ScraperSource, id: number): Promise<void> {
    await api.delete(`${SCRAPERS_ROOT}/scrapers/${source}/data/${id}`);
  },

  async listRejected(source: ScraperSource, params: Params = {}): Promise<RejectedResponse> {
    const { data } = await api.get<RejectedResponse>(`${SCRAPERS_ROOT}/scrapers/${source}/rejected`, { params });
    return data;
  },

  async deleteRejected(source: ScraperSource, id: number): Promise<void> {
    await api.delete(`${SCRAPERS_ROOT}/scrapers/${source}/rejected/${id}`);
  },
};
