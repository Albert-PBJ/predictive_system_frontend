// Capa de datos de la bitácora de auditoría (apps/audit → /api/audit/*).
// Usa la instancia `api` compartida (token + refresh resueltos). Todo el módulo es
// solo ADMIN (espejo de `IsAdmin` en el backend).

import { api } from "./api";
import type { Paginated } from "./types";

export interface AuditLog {
  id: number;
  actor_username: string;
  actor_role: string;
  actor_role_label: string;
  action: string;
  action_label: string;
  category: string;
  category_label: string;
  description: string;
  target_model: string;
  target_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// Opción {value,label} para los desplegables de filtro.
export interface FilterOption {
  value: string;
  label: string;
}

export interface AuditMeta {
  categories: FilterOption[];
  actions: FilterOption[];
  actors: string[];
}

export interface AuditListParams {
  category?: string;
  action?: string;
  actor?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// Sólo los filtros (sin paginación) — para exportar.
type AuditFilters = Omit<AuditListParams, "page" | "page_size">;

export const auditService = {
  async list(params: AuditListParams = {}): Promise<Paginated<AuditLog>> {
    const { data } = await api.get<Paginated<AuditLog>>("/audit/logs", { params });
    return data;
  },

  async meta(): Promise<AuditMeta> {
    const { data } = await api.get<AuditMeta>("/audit/meta");
    return data;
  },

  // Descarga el conjunto filtrado como CSV (dispara la descarga en el navegador).
  async exportCsv(params: AuditFilters = {}): Promise<void> {
    const { data } = await api.get("/audit/logs/export", {
      params,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `auditoria-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Elimina los registros anteriores a una fecha (YYYY-MM-DD). Devuelve el conteo.
  async purge(before: string): Promise<number> {
    const { data } = await api.post<{ deleted: number }>("/audit/logs/purge", { before });
    return data.deleted;
  },

  // Descarga un respaldo COMPLETO de la base de datos en SQL (dispara la descarga en el
  // navegador). Solo ADMIN (espejo de `IsAdmin` en el backend).
  async backupDatabase(): Promise<void> {
    let res;
    try {
      res = await api.get("/audit/backup", { responseType: "blob" });
    } catch (err) {
      // Con responseType "blob" un error de la API llega como Blob; lo convertimos a
      // JSON para que `getApiError` pueda extraer el mensaje { error: "..." }.
      throw await normalizeBlobError(err);
    }

    const blob = new Blob([res.data], { type: "application/sql" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filenameFromDisposition(res.headers["content-disposition"]) ??
      `maescar-respaldo-${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// Extrae el `filename="..."` de una cabecera Content-Disposition, si viene.
function filenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : null;
}

// Reescribe el cuerpo Blob de un error de axios a JSON, para reutilizar `getApiError`.
async function normalizeBlobError(err: unknown): Promise<unknown> {
  const axiosErr = err as { response?: { data?: unknown } };
  const data = axiosErr?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      axiosErr.response!.data = JSON.parse(text);
    } catch {
      /* no era JSON: se deja como estaba y `getApiError` usará el fallback */
    }
  }
  return err;
}
