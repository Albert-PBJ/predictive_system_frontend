import { useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import Alert from "../../components/ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useScraper, type ScraperSource } from "../../context/ScraperContext";

interface SourceConfig {
  title: string;
  description: string;
  urlPlaceholder: string;
  urlHint: string;
  showCompetitor: boolean;
}

const SOURCE_CONFIG: Record<ScraperSource, SourceConfig> = {
  instagram: {
    title: "Instagram",
    description:
      "Recolecta publicaciones de perfiles de Instagram de la competencia y extrae precios, promociones y disponibilidad.",
    urlPlaceholder: "https://www.instagram.com/competidor/",
    urlHint: "Una URL de perfil de Instagram por línea.",
    showCompetitor: false,
  },
  facebook: {
    title: "Facebook Marketplace",
    description:
      "Recolecta publicaciones de Facebook Marketplace de la competencia y extrae precios, categorías y disponibilidad.",
    urlPlaceholder: "https://www.facebook.com/marketplace/item/123/",
    urlHint: "Una URL de Marketplace por línea.",
    showCompetitor: false,
  },
  website: {
    title: "Sitios Web",
    description:
      "Recolecta productos directamente desde páginas web de la competencia usando el AI web scraper.",
    urlPlaceholder: "https://competidor.com/productos/",
    urlHint: "Una URL de sitio web por línea.",
    showCompetitor: true,
  },
};

const PHASE_LABEL: Record<string, string> = {
  starting: "Iniciando el run en Apify…",
  running: "Ejecutando scraper en Apify…",
  saving: "Procesando y guardando resultados…",
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-brand-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function ScraperPage({ source }: { source: ScraperSource }) {
  const config = SOURCE_CONFIG[source];
  const { jobs, startScrape } = useScraper();
  const job = jobs[source];

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
            <Label htmlFor="urls">URLs</Label>
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
                placeholder="Si se omite, se deriva del dominio"
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

      {/* ── Resultados ── */}
      {job?.phase === "done" && job.results.length > 0 && (
        <div className="mt-6">
          <ComponentCard title={`Datos recolectados (${job.results.length})`}>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Producto", "Competidor", "Precio", "Promoción", "Stock"].map((h) => (
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
                      <TableCell className="px-4 py-3 text-sm">
                        <Badge color={r.is_in_stock ? "success" : "error"} variant="light">
                          {r.is_in_stock ? "En stock" : "Agotado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ComponentCard>
        </div>
      )}
    </>
  );
}
