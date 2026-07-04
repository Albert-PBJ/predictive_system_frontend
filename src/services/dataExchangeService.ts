import { api } from "./api";

// Operaciones que se pueden importar/exportar en Excel (continuidad operativa).
export type ImpexEntity = "sales" | "inventory" | "customers" | "quotes";

export type ImportStatus = "ok" | "created" | "duplicate" | "error";

export interface ImportRecordResult {
  ref: string;
  rows: string; // fila(s) del Excel, p. ej. "5" o "8–10"
  status: ImportStatus;
  detail: string;
  errors: string[];
}

export interface ImportSummary {
  total: number;
  ok: number;
  created: number;
  errors: number;
  duplicates: number;
}

export interface ImportResult {
  entity: string;
  label: string;
  committed: boolean;
  summary: ImportSummary;
  records: ImportRecordResult[];
}

function triggerDownload(data: Blob, fallbackName: string, disposition?: string) {
  let name = fallbackName;
  if (disposition) {
    const m = /filename="?([^"]+)"?/.exec(disposition);
    if (m && m[1]) name = m[1];
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const dataExchangeService = {
  async downloadTemplate(entity: ImpexEntity): Promise<void> {
    const res = await api.get(`/data-exchange/${entity}/template`, { responseType: "blob" });
    triggerDownload(res.data, `plantilla_${entity}.xlsx`, res.headers["content-disposition"]);
  },

  async exportData(entity: ImpexEntity, params: Record<string, string | number> = {}): Promise<void> {
    const res = await api.get(`/data-exchange/${entity}/export`, { params, responseType: "blob" });
    triggerDownload(res.data, `export_${entity}.xlsx`, res.headers["content-disposition"]);
  },

  async preview(entity: ImpexEntity, file: File): Promise<ImportResult> {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<ImportResult>(`/data-exchange/${entity}/preview`, fd);
    return data;
  },

  async commit(entity: ImpexEntity, file: File): Promise<ImportResult> {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<ImportResult>(`/data-exchange/${entity}/import`, fd);
    return data;
  },
};
