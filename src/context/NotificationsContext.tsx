import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  notificationsService,
  type AppNotification,
} from "../services/notificationsService";

// Cada cuánto se refresca el feed de notificaciones (alertas del backend). Las
// alertas se generan en el barrido (login/hora) y en tiempo real (movimientos de
// stock), así que un sondeo suave mantiene la campana al día sin recargar la página.
const POLL_INTERVAL_MS = 60_000;

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  // Evita solapar cargas si un sondeo llega antes de terminar el anterior.
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const { results, unread_count } = await notificationsService.list();
      setNotifications(results);
      setUnreadCount(unread_count);
    } catch {
      // best-effort: no molestar al usuario si el feed falla puntualmente
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;
    // Optimista: apaga el indicador de inmediato.
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationsService.markRead();
    } catch {
      // si falla, el próximo sondeo reconciliará el estado real
    }
  }, [isAuthenticated]);

  // Carga inicial + sondeo mientras haya sesión; limpia el feed al cerrar sesión.
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, refresh]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications debe usarse dentro de <NotificationsProvider>");
  return ctx;
}
