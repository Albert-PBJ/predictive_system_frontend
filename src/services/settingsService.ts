// Capa de datos de la Configuración del Sistema (apps/core → /api/settings/*).
// Usa la instancia `api` compartida (token + refresh resueltos). La lectura/escritura
// de la configuración es de Gerente+/Admin; los datos de la empresa (branding de los
// PDFs) están en un endpoint aparte accesible a cualquier usuario autenticado.

import { api } from "./api";

// Configuración editable (espejo de SystemSettingsSerializer en el backend).
export interface SystemSettingsData {
  // Tasa de cambio
  rate_basis: "PAR" | "BCV" | "AVG";
  rate_max_age_days: number;
  exchange_rate_api_url: string;
  // Enriquecimiento LLM
  use_llm_enrichment: boolean;
  deepseek_model: string;
  deepseek_base_url: string;
  enable_llm_report_narrative: boolean;
  // OCR
  use_vision_price_ocr: boolean;
  ocr_languages: string;
  ocr_use_gpu: boolean;
  ocr_max_images_per_post: number;
  ocr_mag_ratio: string;
  ocr_assume_usd_for_bare_number: boolean;
  ocr_bare_number_max_usd: string;
  // Scrapers
  discard_instagram_without_price: boolean;
  scraper_default_limit: number;
  // Valores por defecto de negocio
  default_iva_pct: string;
  default_quote_expiry_days: number;
  // Empresa
  company_name: string;
  company_rif: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_logo_url: string;
  updated_at: string;
}

export interface LatestRate {
  date: string;
  bcv_rate: string;
  parallel_rate: string | null;
  effective_rate: string | null;
  source: string;
}

export interface SettingsMeta {
  deepseek_key_present: boolean;
  openai_installed: boolean;
  easyocr_installed: boolean;
  latest_rate: LatestRate | null;
}

export interface SettingsResponse {
  settings: SystemSettingsData;
  meta: SettingsMeta;
}

export interface RatePayload {
  date: string;
  bcv_rate: string;
  parallel_rate: string | null;
  effective_rate: string | null;
  rate_basis: string;
  source: string;
  freshness?: { is_stale: boolean; age_days: number | null };
  api_url?: string;
  provider?: string;
}

export interface LLMTestResult {
  ok: boolean;
  config: Record<string, unknown>;
  result?: unknown;
  raw_content?: string | null;
  usage?: unknown;
  error?: { stage?: string; type?: string; message?: string; status_code?: number } | null;
}

export interface CompanyInfo {
  name: string;
  rif: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
}

// Subconjunto editable que se puede enviar en un PATCH (todo opcional).
export type SystemSettingsPatch = Partial<Omit<SystemSettingsData, "updated_at">>;

export const settingsService = {
  get(): Promise<SettingsResponse> {
    return api.get<SettingsResponse>("/settings/").then((r) => r.data);
  },

  update(patch: SystemSettingsPatch): Promise<SettingsResponse> {
    return api.patch<SettingsResponse>("/settings/", patch).then((r) => r.data);
  },

  setExchangeRate(input: { bcv: string; parallel?: string; date?: string }): Promise<RatePayload> {
    return api.post<RatePayload>("/settings/exchange-rate", input).then((r) => r.data);
  },

  fetchExchangeRate(): Promise<RatePayload> {
    return api.post<RatePayload>("/settings/exchange-rate/fetch", {}).then((r) => r.data);
  },

  testLLM(): Promise<LLMTestResult> {
    return api.post<LLMTestResult>("/settings/llm-test", {}).then((r) => r.data);
  },

  // Branding para los documentos PDF (accesible a cualquier rol autenticado).
  getCompany(): Promise<CompanyInfo> {
    return api.get<CompanyInfo>("/settings/company").then((r) => r.data);
  },
};
