import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useScraper, type ScraperSource } from "../../context/ScraperContext";
import { scraperScheduleService } from "../../services/scraperScheduleService";

// Fases en las que una fuente está ocupada (no se le lanza otra corrida encima).
const ACTIVE_PHASES = ["starting", "scraping", "processing", "stopping"];
// Re-chequeo periódico para sesiones largas (además del chequeo al iniciar sesión).
const RECHECK_MS = 60 * 60 * 1000;

/**
 * Dispara las programaciones de scraping VENCIDAS cuando el ADMIN tiene sesión activa.
 *
 * No hay cron en el backend (el procesamiento es dirigido por el navegador), así que
 * el disparo automático ocurre aquí: al iniciar sesión el admin —y cada hora durante
 * la sesión— se consultan las programaciones vencidas y se lanza el scraping de cada
 * una reutilizando el flujo por lotes reanudable. No renderiza nada.
 */
export default function ScraperScheduleRunner() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { jobs, startScrape } = useScraper();
  // Programaciones ya disparadas en esta sesión (evita doble disparo entre chequeos).
  const triggered = useRef<Set<number>>(new Set());

  // Se redefine en cada render para capturar `jobs`/`startScrape` frescos, pero el
  // efecto solo depende del estado de auth → el intervalo se crea una sola vez.
  const runDueRef = useRef<() => void>(() => {});
  runDueRef.current = async () => {
    if (!isAuthenticated || role !== "ADMIN") return;
    let due;
    try {
      due = await scraperScheduleService.due();
    } catch {
      return; // silencioso: no molestar al admin si el chequeo falla
    }
    const startedThisPass = new Set<ScraperSource>();
    for (const s of due) {
      if (triggered.current.has(s.id)) continue;
      const source = s.source;
      const active = jobs[source]?.phase;
      const busy =
        startedThisPass.has(source) || (active !== undefined && ACTIVE_PHASES.includes(active));
      if (busy) continue; // esa fuente está ocupada: se reintenta en el próximo chequeo
      triggered.current.add(s.id);
      startedThisPass.add(source);
      try {
        // Reclamar primero (avanza next_run_at), luego lanzar: así un re-chequeo no la
        // vuelve a disparar aunque el scraping falle al iniciar.
        await scraperScheduleService.markRan(s.id);
        startScrape(source, {
          urls: s.urls,
          limit: s.limit,
          competitorName: s.competitor_name || undefined,
          scheduleId: s.id,
        });
      } catch {
        // best-effort: si falla, se reintenta en el próximo periodo
      }
    }
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated || role !== "ADMIN") return;
    runDueRef.current();
    const id = window.setInterval(() => runDueRef.current(), RECHECK_MS);
    return () => window.clearInterval(id);
  }, [isLoading, isAuthenticated, role]);

  return null;
}
