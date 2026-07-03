import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  useScraper,
  type PendingRun,
  type ScraperSource,
} from "../../context/ScraperContext";
import CollectedDataTable from "./CollectedDataTable";
import RejectedDataTable from "./RejectedDataTable";

interface SourceConfig {
  title: string;
  description: string;
  // Etiqueta del campo de entrada. La mayoría de fuentes reciben URLs; Mercado
  // Libre recibe términos de búsqueda.
  inputLabel: string;
  urlPlaceholder: string;
  urlHint: string;
  showCompetitor: boolean;
}

const SOURCE_CONFIG: Record<ScraperSource, SourceConfig> = {
  instagram: {
    title: "Instagram",
    description:
      "Recolecta publicaciones de perfiles de Instagram de la competencia y extrae precios, promociones y disponibilidad.",
    inputLabel: "URLs",
    urlPlaceholder: "https://www.instagram.com/competidor/",
    urlHint: "Una URL de perfil de Instagram por línea.",
    showCompetitor: false,
  },
  website: {
    title: "Sitios Web",
    description:
      "Recolecta productos desde páginas web de la competencia usando el AI web scraper. Extrae nombre, precio, categoría, disponibilidad, entrega y promociones. Para Mercado Libre, usa la página dedicada.",
    inputLabel: "URLs",
    urlPlaceholder: "https://competidor.com/productos/",
    urlHint: "Una URL de sitio web por línea.",
    showCompetitor: true,
  },
  mercadolibre: {
    title: "Mercado Libre",
    description:
      "Busca productos en Mercado Libre Venezuela por términos de búsqueda (usa un actor con proxy dedicado). Extrae precio, vendedor, ubicación, disponibilidad y promociones.",
    inputLabel: "Términos de búsqueda",
    urlPlaceholder: "Sillas de oficina",
    urlHint: "Un término de búsqueda por línea (p. ej. \"Escritorio en L\").",
    showCompetitor: false,
  },
};

const PHASE_LABEL: Record<string, string> = {
  starting: "Iniciando el run en Apify…",
  scraping: "Ejecutando scraper en Apify…",
  processing: "Procesando y guardando por lotes…",
  stopping: "Deteniendo…",
};

export default function ScraperPage({ source }: { source: ScraperSource }) {
  const config = SOURCE_CONFIG[source];
  const { jobs, startScrape, stopScrape, resumeScrape, fetchPending } = useScraper();
  const job = jobs[source];

  // Cuando un scraping termina (o se detiene), incrementamos este token para que la
  // tabla histórica ("Datos recolectados") se recargue con los nuevos registros.
  const [reloadToken, setReloadToken] = useState(0);
  const prevPhase = useRef(job?.phase);
  useEffect(() => {
    const settled = job?.phase === "done" || job?.phase === "stopped";
    const wasSettled = prevPhase.current === "done" || prevPhase.current === "stopped";
    if (!wasSettled && settled) {
      setReloadToken((t) => t + 1);
    }
    prevPhase.current = job?.phase;
  }, [job?.phase]);

  const [urlsText, setUrlsText] = useState("");
  const [limit, setLimit] = useState("50");
  const [competitorName, setCompetitorName] = useState("");

  const urls = useMemo(
    () =>
      urlsText
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean),
    [urlsText],
  );

  const isActive =
    job?.phase === "starting" ||
    job?.phase === "scraping" ||
    job?.phase === "processing" ||
    job?.phase === "stopping";
  const parsedLimit = parseInt(limit, 10);
  const canStart = urls.length > 0 && parsedLimit >= 1 && !isActive;
  const canStop = job?.phase === "scraping" || job?.phase === "processing";

  const handleStart = () => {
    if (!canStart) return;
    startScrape(source, {
      urls,
      limit: parsedLimit,
      competitorName: config.showCompetitor ? competitorName.trim() || undefined : undefined,
    });
  };

  // ── Runs a medio procesar (reanudables tras cierre de pestaña / corte de luz) ──
  const [pending, setPending] = useState<PendingRun[]>([]);
  const refreshPending = useCallback(async () => {
    const list = await fetchPending(source);
    setPending(list);
  }, [fetchPending, source]);
  useEffect(() => {
    refreshPending();
  }, [refreshPending, reloadToken]);

  const stopLabel =
    job?.phase === "scraping"
      ? "Detener recolección"
      : "Detener y guardar lo procesado";

  const processPct =
    job && job.totalItems > 0
      ? Math.min(100, Math.round((job.processedItems / job.totalItems) * 100))
      : 0;

  return (
    <>
      <PageMeta
        title={`Datos externos · ${config.title}`}
        description={config.description}
      />
      <PageBreadcrumb pageTitle={`Datos externos · ${config.title}`} />

      {/* ── Reanudar un procesamiento interrumpido ── */}
      {!isActive && pending.length > 0 && (
        <div className="mb-6">
          <ComponentCard title="Procesamiento sin terminar">
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Hay {pending.length} recolección(es) de esta plataforma con trabajo pendiente
              (se interrumpió antes de terminar). Lo ya procesado quedó guardado; puedes
              reanudar el resto sin repetir lo hecho.
            </p>
            <div className="space-y-3">
              {pending.map((p) => (
                <div
                  key={p.scrape_run_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                >
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      Run #{p.scrape_run_id}
                    </span>{" "}
                    · {p.processed_items} de {p.total_items || "?"} procesados ·{" "}
                    {p.records_saved} guardados
                    {p.started_at && (
                      <span className="text-gray-400">
                        {" "}
                        · {new Date(p.started_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resumeScrape(source, p)}>
                    Reanudar
                  </Button>
                </div>
              ))}
            </div>
          </ComponentCard>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Configuración / disparador ── */}
        <ComponentCard title="Configuración de la recolección" desc={config.description}>
          <div>
            <Label htmlFor="urls">{config.inputLabel}</Label>
            <TextArea
              rows={5}
              value={urlsText}
              onChange={setUrlsText}
              placeholder={config.urlPlaceholder}
              hint={config.urlHint}
              disabled={isActive}
            />
          </div>

          <div>
            <Label htmlFor="limit">Límite de resultados</Label>
            <Input
              type="number"
              min="1"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              disabled={isActive}
            />
          </div>

          {config.showCompetitor && (
            <div>
              <Label htmlFor="competitor">Nombre del competidor (opcional)</Label>
              <Input
                type="text"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Si se omite, se usa el nombre del sitio (p. ej. Mercado Libre)"
                disabled={isActive}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleStart} disabled={!canStart}>
              {isActive ? "Recolección en curso…" : "Iniciar recolección"}
            </Button>
            {isActive && (
              <button
                type="button"
                onClick={() => stopScrape(source)}
                disabled={!canStop}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3.5 text-sm font-medium text-white transition bg-error-500 hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {job?.phase === "stopping" ? "Deteniendo…" : stopLabel}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Puedes detener el proceso en cualquier momento: lo recolectado/procesado hasta
            ese punto se procesa y guarda. El progreso se guarda por lotes, así que un corte
            no pierde el trabajo ya hecho.
          </p>
        </ComponentCard>

        {/* ── Progreso / estado ── */}
        <ComponentCard title="Progreso">
          {(!job || job.phase === "idle") && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configura las URLs e inicia la recolección para ver el progreso aquí.
            </p>
          )}

          {isActive && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Spinner />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {PHASE_LABEL[job!.phase]}
                </span>
              </div>

              {/* Fase de recolección: conteo en vivo + barra indeterminada */}
              {(job!.phase === "starting" || job!.phase === "scraping") && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {job!.itemsScraped} elemento(s) recolectado(s) hasta ahora…
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
                  </div>
                </>
              )}

              {/* Fase de procesamiento: barra determinada + guardados */}
              {(job!.phase === "processing" || job!.phase === "stopping") && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {job!.processedItems} de {job!.totalItems || "?"} procesados
                    {job!.saved != null && ` · ${job!.saved} guardado(s)`}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    {job!.totalItems > 0 ? (
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${processPct}%` }}
                      />
                    ) : (
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
                    )}
                  </div>
                </>
              )}

              <p className="text-xs text-gray-400">
                Puedes navegar a otras páginas: te avisaremos en la barra superior cuando termine.
              </p>
            </div>
          )}

          {job?.phase === "error" && (
            <Alert
              variant="error"
              title="La recolección falló"
              message={job.error ?? "Ocurrió un error inesperado."}
            />
          )}

          {job?.phase === "done" && (
            <Alert
              variant={job.saved && job.saved > 0 ? "success" : "info"}
              title="Recolección completada"
              message={`Se guardaron ${job.saved ?? 0} registro(s) en la base de datos.`}
            />
          )}

          {job?.phase === "stopped" && (
            <Alert
              variant="warning"
              title="Recolección detenida"
              message={
                job.totalItems > 0 && job.processedItems < job.totalItems
                  ? `Se detuvo el proceso y se guardaron ${job.saved ?? 0} registro(s) procesados hasta ese punto. Puedes reanudar el resto desde el aviso de arriba.`
                  : `Se detuvo el proceso y se procesó y guardó todo lo recolectado: ${job.saved ?? 0} registro(s).`
              }
            />
          )}
        </ComponentCard>
      </div>

      {/* ── Resultados del último scraping (en memoria, del run recién ejecutado) ── */}
      {(job?.phase === "done" || job?.phase === "stopped" || job?.phase === "processing") &&
        job.results.length > 0 && (
          <div className="mt-6">
            <ComponentCard title={`Datos recolectados en el último scraping (${job.results.length})`}>
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Producto", "Competidor", "Precio", "Promoción"].map((h) => (
                        <TableCell
                          key={h}
                          isHeader
                          className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {job.results.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                          {r.product_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {r.competitor_name ?? "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {r.price ? `${r.price} ${r.currency ?? ""}`.trim() : "—"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {r.promotions ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ComponentCard>
          </div>
        )}

      {/* ── Histórico: todos los datos recolectados para esta plataforma ── */}
      <div className="mt-6">
        <CollectedDataTable source={source} reloadToken={reloadToken} />
      </div>

      {/* ── Datos descartados por la validación de calidad (datos defectuosos) ── */}
      <div className="mt-6">
        <RejectedDataTable source={source} reloadToken={reloadToken} />
      </div>
    </>
  );
}
