import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "react-router";
import { api } from "../services/api";

// Las rutas de scrapers viven en /scrapers/ (no bajo /api/). Derivamos la raíz
// del backend a partir de la base de la API para reutilizar la instancia `api`
// (que ya adjunta el token y refresca la sesión en 401).
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const SCRAPERS_ROOT = API_BASE.replace(/\/api\/?$/, "");

export type ScraperSource = "instagram" | "facebook" | "website";

// Metadatos compartidos (etiqueta + ruta) usados por el menú, las páginas y
// las notificaciones, para tener una única fuente de verdad.
export const SCRAPER_META: Record<ScraperSource, { label: string; path: string }> = {
  instagram: { label: "Instagram", path: "/datos-externos/instagram" },
  facebook: { label: "Facebook Marketplace", path: "/datos-externos/facebook" },
  website: { label: "Sitios Web", path: "/datos-externos/web" },
};

export type ScraperPhase =
  | "idle"
  | "starting"
  | "running"
  | "saving"
  | "done"
  | "error";

export interface ScrapedRecord {
  id: number;
  competitor_name: string | null;
  product_name: string | null;
  price: string | null;
  currency: string | null;
  promotions: string | null;
  is_in_stock: boolean | null;
  lead_time_days: number | null;
  url: string | null;
  source: string;
}

interface ScrapeParams {
  urls: string[];
  limit: number;
  competitorName?: string;
}

export interface ScraperJob {
  source: ScraperSource;
  phase: ScraperPhase;
  itemsScraped: number;
  results: ScrapedRecord[];
  saved: number | null;
  error: string | null;
}

export interface ScraperNotification {
  id: string;
  source: ScraperSource;
  saved: number;
  read: boolean;
}

interface ScraperContextValue {
  jobs: Partial<Record<ScraperSource, ScraperJob>>;
  notifications: ScraperNotification[];
  unreadCount: number;
  startScrape: (source: ScraperSource, params: ScrapeParams) => void;
  markNotificationsRead: () => void;
  clearNotification: (id: string) => void;
}

const ScraperContext = createContext<ScraperContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 2000;

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { error?: string } } };
    if (maybe.response?.data?.error) return maybe.response.data.error;
  }
  return fallback;
}

export function ScraperProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Partial<Record<ScraperSource, ScraperJob>>>({});
  const [notifications, setNotifications] = useState<ScraperNotification[]>([]);

  // Ruta actual: la mantenemos en un ref para compararla al finalizar un job
  // sin recrear los closures de polling.
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  // Intervalos de polling activos, indexados por fuente.
  const pollers = useRef<Partial<Record<ScraperSource, number>>>({});
  // Evita que dos sondeos solapados finalicen (y guarden) el mismo run dos veces.
  const terminalHandled = useRef<Partial<Record<ScraperSource, boolean>>>({});

  const stopPolling = useCallback((source: ScraperSource) => {
    const id = pollers.current[source];
    if (id !== undefined) {
      window.clearInterval(id);
      delete pollers.current[source];
    }
  }, []);

  // Limpia todos los intervalos al desmontar el provider.
  useEffect(() => {
    const active = pollers.current;
    return () => {
      Object.values(active).forEach((id) => id !== undefined && window.clearInterval(id));
    };
  }, []);

  const patchJob = useCallback((source: ScraperSource, patch: Partial<ScraperJob>) => {
    setJobs((prev) => {
      const current = prev[source] ?? {
        source,
        phase: "idle" as ScraperPhase,
        itemsScraped: 0,
        results: [],
        saved: null,
        error: null,
      };
      return { ...prev, [source]: { ...current, ...patch } };
    });
  }, []);

  const finalize = useCallback(
    async (source: ScraperSource, datasetId: string, params: ScrapeParams, triggeredFrom: string) => {
      patchJob(source, { phase: "saving" });
      try {
        const body: Record<string, unknown> = { dataset_id: datasetId };
        if (source === "website") {
          body.urls = params.urls;
          body.competitor_name = params.competitorName || null;
        }
        const { data } = await api.post(`${SCRAPERS_ROOT}/scrapers/${source}/finalize`, body);
        patchJob(source, {
          phase: "done",
          results: data.results ?? [],
          saved: data.saved ?? 0,
        });
        // Solo notificamos en la barra superior si el usuario YA NO está en la
        // página que disparó el scraping (si sigue en ella, ve el resultado inline).
        if (locationRef.current !== triggeredFrom) {
          setNotifications((prev) => [
            { id: `${source}-${Date.now()}`, source, saved: data.saved ?? 0, read: false },
            ...prev,
          ]);
        }
      } catch (err) {
        patchJob(source, {
          phase: "error",
          error: errorMessage(err, "No se pudieron guardar los resultados."),
        });
      }
    },
    [patchJob],
  );

  const startScrape = useCallback(
    async (source: ScraperSource, params: ScrapeParams) => {
      // Evita lanzar un segundo run de la misma fuente mientras hay uno activo.
      const active = jobs[source]?.phase;
      if (active === "starting" || active === "running" || active === "saving") return;

      const triggeredFrom = locationRef.current;
      stopPolling(source);
      terminalHandled.current[source] = false;
      patchJob(source, {
        phase: "starting",
        itemsScraped: 0,
        results: [],
        saved: null,
        error: null,
      });

      let runId: string;
      let datasetId: string;
      try {
        const { data } = await api.post(`${SCRAPERS_ROOT}/scrapers/${source}/start`, {
          urls: params.urls,
          limit: params.limit,
          competitor_name: params.competitorName || null,
        });
        runId = data.run_id;
        datasetId = data.dataset_id;
      } catch (err) {
        patchJob(source, {
          phase: "error",
          error: errorMessage(err, "No se pudo iniciar el scraper."),
        });
        return;
      }

      patchJob(source, { phase: "running" });

      const poll = async () => {
        try {
          const { data } = await api.get(`${SCRAPERS_ROOT}/scrapers/${source}/status`, {
            params: { run_id: runId, dataset_id: datasetId },
          });
          patchJob(source, { itemsScraped: data.items_scraped ?? 0 });

          if (data.is_terminal) {
            // Solo el primer sondeo que vea un estado terminal lo procesa.
            if (terminalHandled.current[source]) return;
            terminalHandled.current[source] = true;
            stopPolling(source);
            if (data.succeeded) {
              await finalize(source, datasetId, params, triggeredFrom);
            } else {
              patchJob(source, {
                phase: "error",
                error: `El run de Apify terminó con estado: ${data.status}.`,
              });
            }
          }
        } catch (err) {
          stopPolling(source);
          patchJob(source, {
            phase: "error",
            error: errorMessage(err, "Error al consultar el progreso del scraper."),
          });
        }
      };

      pollers.current[source] = window.setInterval(poll, POLL_INTERVAL_MS);
      poll(); // Primer sondeo inmediato (el run puede ser muy rápido).
    },
    [jobs, stopPolling, patchJob, finalize],
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScraperContext.Provider
      value={{
        jobs,
        notifications,
        unreadCount,
        startScrape,
        markNotificationsRead,
        clearNotification,
      }}
    >
      {children}
    </ScraperContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScraper() {
  const ctx = useContext(ScraperContext);
  if (!ctx) throw new Error("useScraper debe usarse dentro de <ScraperProvider>");
  return ctx;
}
