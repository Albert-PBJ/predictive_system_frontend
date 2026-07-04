import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import ScheduleFormModal from "../../components/scrapers/ScheduleFormModal";
import { scraperScheduleService, type ScraperSchedule } from "../../services/scraperScheduleService";
import { getApiError } from "../../services/apiError";
import { useScraper } from "../../context/ScraperContext";

const ACTIVE_PHASES = ["starting", "scraping", "processing", "stopping"];

function fmtDate(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function ScraperSchedules() {
  const { jobs, startScrape } = useScraper();
  const [schedules, setSchedules] = useState<ScraperSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScraperSchedule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSchedules(await scraperScheduleService.list());
    } catch (err) {
      setError(getApiError(err, "No se pudieron cargar las programaciones."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: ScraperSchedule) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleDelete = async (s: ScraperSchedule) => {
    if (!window.confirm(`¿Eliminar la programación "${s.name || s.source_display}"?`)) return;
    try {
      await scraperScheduleService.remove(s.id);
      setNotice(null);
      load();
    } catch (err) {
      setError(getApiError(err, "No se pudo eliminar la programación."));
    }
  };

  const handleRunNow = async (s: ScraperSchedule) => {
    setNotice(null);
    setError(null);
    const active = jobs[s.source]?.phase;
    if (active !== undefined && ACTIVE_PHASES.includes(active)) {
      setError(`Ya hay una recolección en curso para ${s.source_display}. Espera a que termine.`);
      return;
    }
    startScrape(s.source, {
      urls: s.urls,
      limit: s.limit,
      competitorName: s.competitor_name || undefined,
      scheduleId: s.id,
    });
    try {
      await scraperScheduleService.markRan(s.id);
    } catch {
      // el disparo ya ocurrió; ignorar
    }
    setNotice(
      `Recolección de "${s.name || s.source_display}" iniciada. Mira el progreso en la barra superior o en la página de ${s.source_display}.`,
    );
    load();
  };

  return (
    <>
      <PageMeta
        title="Datos externos · Programación"
        description="Programa recolecciones automáticas recurrentes de la competencia."
      />
      <PageBreadcrumb pageTitle="Datos externos · Programación de scraping" />

      <ComponentCard
        title="Programaciones de scraping automático"
        desc="Define listas de competidores a re-scrapear con una frecuencia (p. ej. mensual). Se ejecutan solas cuando un administrador inicia sesión y la programación está vencida; el progreso se guarda por lotes y es reanudable."
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {schedules.length} programación(es).
          </p>
          <Button size="sm" onClick={openNew}>
            Nueva programación
          </Button>
        </div>

        {notice && (
          <div className="mb-4">
            <Alert variant="success" title="Recolección iniciada" message={notice} />
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : schedules.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay programaciones. Crea una para automatizar la recolección de competidores.
          </p>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {["Nombre", "Fuente", "Contenido", "Frecuencia", "Próxima ejecución", "Última", "Estado", ""].map(
                    (h) => (
                      <TableCell
                        key={h}
                        isHeader
                        className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        {h}
                      </TableCell>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                      {s.name || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {s.source_display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {s.urls.length} {s.source === "mercadolibre" ? "término(s)" : "URL(s)"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {s.frequency_display}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {fmtDate(s.next_run_at)}
                      {s.is_due && s.is_active && (
                        <span className="ml-2 rounded-full bg-warning-50 px-2 py-0.5 text-theme-xs font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
                          Vencida
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {fmtDate(s.last_run_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-theme-xs font-medium ${
                          s.is_active
                            ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {s.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <button
                          onClick={() => handleRunNow(s)}
                          className="font-medium text-brand-500 hover:text-brand-600"
                        >
                          Ejecutar ahora
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          className="font-medium text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="font-medium text-error-500 hover:text-error-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ComponentCard>

      <ScheduleFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        schedule={editing}
        onSaved={load}
      />
    </>
  );
}
