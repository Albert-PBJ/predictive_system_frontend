import { api } from "./api";
import type { ScraperSource } from "../context/ScraperContext";

// Las rutas de scrapers viven en /scrapers/ (no bajo /api/). Derivamos la raíz del
// backend desde la base de la API, igual que en ScraperContext / scraperDataService.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const SCRAPERS_ROOT = API_BASE.replace(/\/api\/?$/, "");

export type ScheduleFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export interface ScraperSchedule {
  id: number;
  name: string;
  source: ScraperSource;
  urls: string[];
  competitor_name: string;
  limit: number;
  frequency: ScheduleFrequency;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  created_at: string;
  updated_at: string;
  source_display: string;
  frequency_display: string;
  is_due: boolean;
}

// Campos que el admin envía al crear/editar una programación.
export interface ScheduleInput {
  name?: string;
  source: ScraperSource;
  urls: string[];
  competitor_name?: string;
  limit?: number;
  frequency?: ScheduleFrequency;
  is_active?: boolean;
  next_run_at?: string;
}

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quincenal",
  MONTHLY: "Mensual",
};

export const scraperScheduleService = {
  async list(): Promise<ScraperSchedule[]> {
    const { data } = await api.get<ScraperSchedule[]>(`${SCRAPERS_ROOT}/scrapers/schedules`);
    return data;
  },

  async create(payload: ScheduleInput): Promise<ScraperSchedule> {
    const { data } = await api.post<ScraperSchedule>(`${SCRAPERS_ROOT}/scrapers/schedules`, payload);
    return data;
  },

  async update(id: number, payload: Partial<ScheduleInput>): Promise<ScraperSchedule> {
    const { data } = await api.patch<ScraperSchedule>(`${SCRAPERS_ROOT}/scrapers/schedules/${id}`, payload);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`${SCRAPERS_ROOT}/scrapers/schedules/${id}`);
  },

  async due(): Promise<ScraperSchedule[]> {
    const { data } = await api.get<{ due: ScraperSchedule[] }>(`${SCRAPERS_ROOT}/scrapers/schedules/due`);
    return data.due ?? [];
  },

  async markRan(id: number): Promise<ScraperSchedule> {
    const { data } = await api.post<ScraperSchedule>(`${SCRAPERS_ROOT}/scrapers/schedules/${id}/ran`, {});
    return data;
  },
};
