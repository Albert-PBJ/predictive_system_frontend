// Capa de datos de las notificaciones (sistema de alertas). Usa la instancia `api`
// compartida (token + refresh resueltos). El feed es específico del usuario: cada
// alerta trae su estado de leído para el usuario autenticado.

import { api } from "./api";

export type AlertSeverity = "INFO" | "WARN" | "CRIT";

export interface AppNotification {
  id: number;
  type: string;         // código del tipo de alerta (STOCK_P, STOCK_B, DEMAND, …)
  type_label: string;   // etiqueta legible en español
  severity: AlertSeverity;
  severity_label: string;
  title: string;
  message: string;
  is_resolved: boolean;
  read: boolean;        // leído por el usuario actual
  created_at: string;
  updated_at: string;
}

export interface NotificationList {
  results: AppNotification[];
  unread_count: number;
}

export const notificationsService = {
  // Feed del usuario (alertas de su audiencia) + no leídas.
  async list(): Promise<NotificationList> {
    const { data } = await api.get("/analytics/notifications");
    return data;
  },

  // Marca leídas: todas las visibles, o solo las ids indicadas.
  async markRead(ids?: number[]): Promise<{ marked: number }> {
    const { data } = await api.post("/analytics/notifications/read", ids ? { ids } : {});
    return data;
  },

  // Dispara el barrido predictivo de alertas (throttled en el backend).
  async scan(): Promise<{ unread_count: number }> {
    const { data } = await api.post("/analytics/notifications/scan", {});
    return data;
  },
};
