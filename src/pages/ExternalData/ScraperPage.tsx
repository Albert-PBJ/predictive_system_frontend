import { useEffect, useMemo, useRef, useState } from "react";
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
import { useScraper, type ScraperSource } from "../../context/ScraperContext";
import CollectedDataTable from "./CollectedDataTable";

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
  facebook: {
    title: "Facebook Marketplace",
    description:
      "Recolecta publicaciones de Facebook Marketplace de la competencia y extrae precios, categorías y disponibilidad.",
    inputLabel: "URLs",
    urlPlaceholder: "https://www.facebook.com/marketplace/item/123/",
    urlHint: "Una URL de Marketplace por línea.",
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
  running: "Ejecutando scraper en Apify…",
  saving: "Procesando y guardando resultados…",
};

export default function ScraperPage({ source }: { source: ScraperSource }) {
  const config = SOURCE_CONFIG[source];
  const { jobs, startScrape } = useScraper();
  const job = jobs[source];

  // Cuando un scraping termina, incrementamos este token para que la tabla
  // histórica ("Datos recolectados") se recargue con los nuevos registros.
  const [reloadToken, setReloadToken] = useState(0);
  const prevPhase = useRef(job?.phase);
  useEffect(() => {
    if (prevPhase.current !== "done" && job?.phase === "done") {
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
    job?.phase === "starting" || job?.phase === "running" || job?.phase === "saving";
  const parsedLimit = parseInt(limit, 10);
  const canStart = urls.length > 0 && parsedLimit >= 1 && !isActive;

  const handleStart = () => {
    if (!canStart) return;
    startScrape(source, {
      urls,
      limit: parsedLimit,
      competitorName: config.showCompetitor ? competitorName.trim() || undefined : undefined,
    });
  };

  return (
    <>
      <PageMeta
        title={`Datos externos · ${config.title}`}
        description={config.description}
      />
      <PageBreadcrumb pageTitle={`Datos externos · ${config.title}`} />

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

          <Button onClick={handleStart} disabled={!canStart}>
            {isActive ? "Recolección en curso…" : "Iniciar recolección"}
          </Button>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job!.itemsScraped} elemento(s) recolectado(s) hasta ahora…
              </p>
              {/* Barra de progreso indeterminada */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" />
              </div>
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
        </ComponentCard>
      </div>

      {/* ── Resultados del último scraping (en memoria, del run recién ejecutado) ── */}
      {job?.phase === "done" && job.results.length > 0 && (
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
    </>
  );
}
