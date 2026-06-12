import { useState } from "react";
import { analyticsService } from "../../services/analyticsService";
import type { OverviewResponse, ForecastResponse, ReportNarrative } from "../../services/analyticsService";
import type { ExecutiveDashboard } from "../../services/statsService";
import Spinner from "../common/Spinner";

/**
 * Botón "Generar reporte" del panel de Inicio. Construye un PDF ejecutivo (máx. 5
 * páginas) con la situación actual, riesgos, estimaciones y acciones, a partir de los
 * datos del rango ya cargados (`data`). El TEXTO de análisis lo redacta el LLM
 * (endpoint `/analytics/report-narrative`); si no está configurado o falla, el
 * documento cae a la síntesis determinista. Si el usuario es Gerente/Admin
 * (`canForecast`), además trae los pronósticos del módulo predictivo para la sección
 * de estimaciones. El PDF se arma en el navegador.
 */
export default function GenerateReportButton({
  data,
  canForecast,
  userName,
}: {
  data: ExecutiveDashboard;
  canForecast: boolean;
  userName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let overview: OverviewResponse | null = null;
      let revenueForecast: ForecastResponse | null = null;

      const range = { from: data.range.from, to: data.range.to };

      // El texto de análisis lo redacta el LLM en el backend (mismo rango que el panel).
      // Se lanza en paralelo con las proyecciones; si falla, el documento cae a la
      // síntesis determinista (por eso .catch → null, no rompe la generación).
      const narrativePromise: Promise<ReportNarrative | null> = analyticsService
        .reportNarrative(range)
        .catch(() => null);

      // Las proyecciones son de gerencia (IsManager). Cada una se trae por separado:
      // si una falla, el reporte se genera igual sin esa parte.
      if (canForecast) {
        const [ov, rf] = await Promise.allSettled([
          analyticsService.overview(),
          analyticsService.sales("revenue", 6),
        ]);
        if (ov.status === "fulfilled") overview = ov.value;
        if (rf.status === "fulfilled") revenueForecast = rf.value;
      }

      const narrative = await narrativePromise;

      // Carga diferida de la librería de PDF (chunk aparte): solo al generar.
      const { buildReportBlob } = await import("./generateReport");
      const blob = await buildReportBlob({
        data,
        overview,
        revenueForecast,
        narrative,
        generatedAt: new Date(),
        userName,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte-Maescar-${data.range.from}_${data.range.to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Liberar el objeto tras dar tiempo a que arranque la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el reporte. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner className="h-4 w-4 text-white" /> Generando…
          </>
        ) : (
          <>
            <svg className="size-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10 2.5v9m0 0L6.5 8M10 11.5 13.5 8M3.5 13v2.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Generar reporte PDF
          </>
        )}
      </button>
      {error && <span className="text-xs text-error-500">{error}</span>}
    </div>
  );
}
