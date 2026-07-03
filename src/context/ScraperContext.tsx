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

// Facebook Marketplace se excluyó de la UI (decisión del proyecto): el scraper de
// backend se conserva, pero no se expone ninguna página ni se usan sus datos.
export type ScraperSource = "instagram" | "website" | "mercadolibre";

// Metadatos compartidos (etiqueta + ruta) usados por el menú, las páginas y
// las notificaciones, para tener una única fuente de verdad.
export const SCRAPER_META: Record<ScraperSource, { label: string; path: string }> = {
  instagram: { label: "Instagram", path: "/datos-externos/instagram" },
  website: { label: "Sitios Web", path: "/datos-externos/web" },
  mercadolibre: { label: "Mercado Libre", path: "/datos-externos/mercadolibre" },
};

export type ScraperPhase =
  | "idle"
  | "starting"     // creando el run en Apify
  | "scraping"     // Apify recolectando (polling de progreso)
  | "processing"   // guardando por lotes (checkpoints reanudables)
  | "stopping"     // parada pedida; terminando el lote/recolección en curso
  | "done"         // procesado por completo
  | "stopped"      // detenido por el usuario (se guardó lo procesado)
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
  itemsScraped: number;      // elementos recolectados por Apify (fase scraping)
  processedItems: number;    // unidades ya procesadas/guardadas (fase processing)
  totalItems: number;        // total de unidades a procesar
  results: ScrapedRecord[];  // registros guardados, acumulados entre lotes
  saved: number | null;      // total guardado (acumulado en el backend)
  error: string | null;
  // Identificadores para detener/reanudar el run.
  runId?: string;
  datasetId?: string;
  scrapeRunId?: number;
  params?: ScrapeParams;
}

// Run a medio procesar que se puede reanudar (viene de GET …/pending).
export interface PendingRun {
  scrape_run_id: number;
  apify_run_id: string;
  dataset_id: string;
  status: string;
  processed_items: number;
  total_items: number;
  records_saved: number;
  query: string[];
  params: Record<string, unknown> | null;
  started_at: string | null;
}

export interface ScraperNotification {
  id: string;
  source: ScraperSource;
  saved: number;
  stopped: boolean;
  read: boolean;
}

interface ScraperContextValue {
  jobs: Partial<Record<ScraperSource, ScraperJob>>;
  notifications: ScraperNotification[];
  unreadCount: number;
  startScrape: (source: ScraperSource, params: ScrapeParams) => void;
  stopScrape: (source: ScraperSource) => void;
  resumeScrape: (source: ScraperSource, pending: PendingRun) => void;
  fetchPending: (source: ScraperSource) => Promise<PendingRun[]>;
  markNotificationsRead: () => void;
  clearNotification: (id: string) => void;
}

const ScraperContext = createContext<ScraperContextValue | undefined>(undefined);

const POLL_INTERVAL_MS = 2000;

// Tamaño de lote por fuente. Las fuentes con LLM/OCR usan lotes chicos → checkpoints
// muy frecuentes (muy por debajo de los 10 min pedidos); las deterministas, más grandes.
const CHUNK_SIZE: Record<ScraperSource, number> = {
  instagram: 4,
  website: 20,
  mercadolibre: 8,
};

// Tope de filas que mantenemos en memoria para la tabla de "último scraping".
const RESULTS_CAP = 1000;

function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { error?: string } } };
    if (maybe.response?.data?.error) return maybe.response.data.error;
  }
  return fallback;
}

const scrapersUrl = (source: ScraperSource, path: string) =>
  `${SCRAPERS_ROOT}/scrapers/${source}/${path}`;

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

  // Intervalos de polling activos (fase scraping), indexados por fuente.
  const pollers = useRef<Partial<Record<ScraperSource, number>>>({});
  // Evita que dos sondeos solapados disparen el procesamiento dos veces.
  const terminalHandled = useRef<Partial<Record<ScraperSource, boolean>>>({});
  // El usuario pidió detener la RECOLECCIÓN (fase scraping): al llegar a estado
  // terminal, procesamos igual lo recolectado hasta ahí.
  const collectionStopped = useRef<Partial<Record<ScraperSource, boolean>>>({});
  // El usuario pidió detener el PROCESAMIENTO: el bucle de lotes corta tras el actual.
  const stopProcessing = useRef<Partial<Record<ScraperSource, boolean>>>({});
  // Token por fuente para invalidar bucles de procesamiento viejos (start/resume nuevos).
  const processToken = useRef<Partial<Record<ScraperSource, number>>>({});

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
      const current = prev[source] ?? emptyJob(source);
      return { ...prev, [source]: { ...current, ...patch } };
    });
  }, []);

  const updateJob = useCallback(
    (source: ScraperSource, updater: (current: ScraperJob) => Partial<ScraperJob>) => {
      setJobs((prev) => {
        const current = prev[source] ?? emptyJob(source);
        return { ...prev, [source]: { ...current, ...updater(current) } };
      });
    },
    [],
  );

  const notifyIfAway = useCallback(
    (source: ScraperSource, saved: number, stopped: boolean, triggeredFrom: string) => {
      if (locationRef.current !== triggeredFrom) {
        setNotifications((prev) => [
          { id: `${source}-${Date.now()}`, source, saved, stopped, read: false },
          ...prev,
        ]);
      }
    },
    [],
  );

  // ── Fase de procesamiento: bucle de lotes con checkpoints ───────────────────
  const runProcessingLoop = useCallback(
    async (
      source: ScraperSource,
      opts: {
        datasetId: string;
        scrapeRunId?: number;
        params?: ScrapeParams;
        startOffset: number;
        triggeredFrom: string;
        resume?: boolean;
      },
    ) => {
      const token = (processToken.current[source] ?? 0) + 1;
      processToken.current[source] = token;
      stopProcessing.current[source] = false;

      patchJob(source, { phase: "processing", processedItems: opts.startOffset });

      let offset = opts.startOffset;
      let lastSaved = 0;
      const chunkSize = CHUNK_SIZE[source] ?? 5;

      for (;;) {
        // Un start/resume más nuevo invalidó este bucle.
        if (processToken.current[source] !== token) return;

        // Parada pedida durante el procesamiento: el backend ya cerró el run como
        // DETENIDO (vía /stop); aquí solo dejamos de pedir lotes.
        if (stopProcessing.current[source]) {
          patchJob(source, { phase: "stopped" });
          notifyIfAway(source, lastSaved, true, opts.triggeredFrom);
          return;
        }

        let data: {
          processed_items: number;
          total_items: number;
          total_saved: number;
          done: boolean;
          stopped: boolean;
          saved_in_chunk?: number;
          results?: ScrapedRecord[];
        };
        try {
          const resp = await api.post(scrapersUrl(source, "process-chunk"), {
            dataset_id: opts.datasetId,
            scrape_run_id: opts.scrapeRunId,
            offset,
            chunk_size: chunkSize,
            resume: opts.resume ?? false,
            urls: opts.params?.urls,
            competitor_name: opts.params?.competitorName || null,
          });
          data = resp.data;
        } catch (err) {
          if (processToken.current[source] !== token) return;
          patchJob(source, {
            phase: "error",
            error: errorMessage(err, "Error al procesar un lote de resultados."),
          });
          return;
        }

        if (processToken.current[source] !== token) return;

        offset = data.processed_items ?? offset;
        lastSaved = data.total_saved ?? lastSaved;
        const newRows = data.results ?? [];
        updateJob(source, (current) => ({
          processedItems: data.processed_items ?? current.processedItems,
          totalItems: data.total_items ?? current.totalItems,
          saved: data.total_saved ?? current.saved,
          results: [...newRows, ...current.results].slice(0, RESULTS_CAP),
        }));

        if (data.done || data.stopped) {
          const stopped = !!data.stopped;
          patchJob(source, { phase: stopped ? "stopped" : "done" });
          notifyIfAway(source, data.total_saved ?? 0, stopped, opts.triggeredFrom);
          return;
        }
      }
    },
    [patchJob, updateJob, notifyIfAway],
  );

  // ── Fase de recolección: polling de Apify hasta estado terminal ─────────────
  const startPolling = useCallback(
    (
      source: ScraperSource,
      opts: { runId: string; datasetId: string; scrapeRunId?: number; params?: ScrapeParams; triggeredFrom: string },
    ) => {
      stopPolling(source);
      terminalHandled.current[source] = false;

      const poll = async () => {
        try {
          const { data } = await api.get(scrapersUrl(source, "status"), {
            params: { run_id: opts.runId, dataset_id: opts.datasetId },
          });
          patchJob(source, { itemsScraped: data.items_scraped ?? 0 });

          if (data.is_terminal) {
            if (terminalHandled.current[source]) return;
            terminalHandled.current[source] = true;
            stopPolling(source);
            // Éxito, o el usuario detuvo la recolección → procesamos lo recolectado.
            if (data.succeeded || collectionStopped.current[source]) {
              collectionStopped.current[source] = false;
              runProcessingLoop(source, {
                datasetId: opts.datasetId,
                scrapeRunId: opts.scrapeRunId,
                params: opts.params,
                startOffset: 0,
                triggeredFrom: opts.triggeredFrom,
              });
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
    [patchJob, stopPolling, runProcessingLoop],
  );

  const startScrape = useCallback(
    async (source: ScraperSource, params: ScrapeParams) => {
      // Evita lanzar un segundo run de la misma fuente mientras hay uno activo.
      const active = jobs[source]?.phase;
      if (active && ["starting", "scraping", "processing", "stopping"].includes(active)) return;

      const triggeredFrom = locationRef.current;
      stopPolling(source);
      collectionStopped.current[source] = false;
      stopProcessing.current[source] = false;
      processToken.current[source] = (processToken.current[source] ?? 0) + 1;

      patchJob(source, {
        ...emptyJob(source),
        phase: "starting",
        params,
      });

      let runId: string;
      let datasetId: string;
      let scrapeRunId: number | undefined;
      try {
        const { data } = await api.post(scrapersUrl(source, "start"), {
          urls: params.urls,
          limit: params.limit,
          competitor_name: params.competitorName || null,
        });
        runId = data.run_id;
        datasetId = data.dataset_id;
        scrapeRunId = data.scrape_run_id;
      } catch (err) {
        patchJob(source, {
          phase: "error",
          error: errorMessage(err, "No se pudo iniciar el scraper."),
        });
        return;
      }

      patchJob(source, { phase: "scraping", runId, datasetId, scrapeRunId });
      startPolling(source, { runId, datasetId, scrapeRunId, params, triggeredFrom });
    },
    [jobs, stopPolling, patchJob, startPolling],
  );

  const stopScrape = useCallback(
    async (source: ScraperSource) => {
      const job = jobs[source];
      if (!job) return;
      const scraping = job.phase === "starting" || job.phase === "scraping";
      const processing = job.phase === "processing";
      if (!scraping && !processing) return;

      if (scraping) {
        // Detener la recolección: abortamos en Apify; al llegar a terminal se procesa
        // lo recolectado (marcamos collectionStopped para que el poll lo procese).
        collectionStopped.current[source] = true;
      } else {
        // Detener el procesamiento: el bucle corta tras el lote actual.
        stopProcessing.current[source] = true;
      }
      patchJob(source, { phase: "stopping" });

      try {
        await api.post(scrapersUrl(source, "stop"), {
          scrape_run_id: job.scrapeRunId,
          run_id: job.runId,
        });
      } catch {
        // Mejor esfuerzo: aunque falle el /stop, el bucle local ya no pedirá más lotes.
      }
    },
    [jobs, patchJob],
  );

  const fetchPending = useCallback(async (source: ScraperSource): Promise<PendingRun[]> => {
    try {
      const { data } = await api.get(scrapersUrl(source, "pending"));
      return data.pending ?? [];
    } catch {
      return [];
    }
  }, []);

  const resumeScrape = useCallback(
    (source: ScraperSource, pending: PendingRun) => {
      const active = jobs[source]?.phase;
      if (active && ["starting", "scraping", "processing", "stopping"].includes(active)) return;

      const triggeredFrom = locationRef.current;
      stopPolling(source);
      collectionStopped.current[source] = false;
      stopProcessing.current[source] = false;

      const params: ScrapeParams = {
        urls: pending.query ?? [],
        limit: Number((pending.params ?? {})["limit"]) || 50,
        competitorName: (pending.params ?? {})["competitor_name"] as string | undefined,
      };

      patchJob(source, {
        ...emptyJob(source),
        phase: "processing",
        runId: pending.apify_run_id || undefined,
        datasetId: pending.dataset_id,
        scrapeRunId: pending.scrape_run_id,
        params,
        processedItems: pending.processed_items,
        totalItems: pending.total_items,
        saved: pending.records_saved,
      });

      // Si la recolección quedó en curso (status RUN), reanudamos por polling; si no,
      // reanudamos el procesamiento desde el checkpoint.
      if (pending.status === "RUN" && pending.apify_run_id) {
        patchJob(source, { phase: "scraping" });
        startPolling(source, {
          runId: pending.apify_run_id,
          datasetId: pending.dataset_id,
          scrapeRunId: pending.scrape_run_id,
          params,
          triggeredFrom,
        });
      } else {
        runProcessingLoop(source, {
          datasetId: pending.dataset_id,
          scrapeRunId: pending.scrape_run_id,
          params,
          startOffset: pending.processed_items,
          triggeredFrom,
          resume: true,
        });
      }
    },
    [jobs, stopPolling, patchJob, startPolling, runProcessingLoop],
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
        stopScrape,
        resumeScrape,
        fetchPending,
        markNotificationsRead,
        clearNotification,
      }}
    >
      {children}
    </ScraperContext.Provider>
  );
}

function emptyJob(source: ScraperSource): ScraperJob {
  return {
    source,
    phase: "idle",
    itemsScraped: 0,
    processedItems: 0,
    totalItems: 0,
    results: [],
    saved: null,
    error: null,
    runId: undefined,
    datasetId: undefined,
    scrapeRunId: undefined,
    params: undefined,
  };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useScraper() {
  const ctx = useContext(ScraperContext);
  if (!ctx) throw new Error("useScraper debe usarse dentro de <ScraperProvider>");
  return ctx;
}
