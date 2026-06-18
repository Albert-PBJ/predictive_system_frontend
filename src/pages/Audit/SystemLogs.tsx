import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useModal } from "../../hooks/useModal";
import { useAuth } from "../../context/AuthContext";
import { auditService, type AuditLog, type AuditMeta } from "../../services/auditService";
import { getApiError } from "../../services/apiError";
import { fmtDateTime, todayISO } from "../../utils/format";

const PAGE_SIZE = 20;

// Raíz del backend (fuera de /api) para enlazar al panel de administración de Django,
// donde el admin crea y gestiona usuarios. Mismo patrón que context/ScraperContext.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const DJANGO_ADMIN_USER_ADD_URL = `${API_BASE.replace(/\/api\/?$/, "")}/admin/auth/user/add/`;

// Color del chip por categoría (para distinguir las áreas de un vistazo).
function categoryColor(
  cat: string,
): "primary" | "success" | "error" | "warning" | "info" | "light" | "dark" {
  switch (cat) {
    case "VENTAS":
      return "success";
    case "INVENTARIO":
      return "info";
    case "SCRAPERS":
      return "primary";
    case "REPORTES":
      return "warning";
    case "USUARIOS":
      return "dark";
    case "CATALOGO":
      return "info";
    case "CLIENTES":
      return "primary";
    case "CONFIG":
      return "warning";
    case "AUTH":
      return "light";
    default:
      return "light";
  }
}

export default function SystemLogs() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [meta, setMeta] = useState<AuditMeta | null>(null);

  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Respaldo completo de la base de datos en SQL (solo ADMIN).
  const [backingUp, setBackingUp] = useState(false);
  const [backupOk, setBackupOk] = useState(false);

  const [selected, setSelected] = useState<AuditLog | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  // Modal de purga.
  const purge = useModal();
  const [purgeBefore, setPurgeBefore] = useState("");
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeResult, setPurgeResult] = useState<number | null>(null);

  // Opciones de los filtros (desde el endpoint de meta).
  useEffect(() => {
    auditService
      .meta()
      .then(setMeta)
      .catch(() => setMeta({ categories: [], actions: [], actors: [] }));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [category, action, actor, dateFrom, dateTo, debouncedSearch]);

  const filters = useMemo(
    () => ({
      category: category || undefined,
      action: action || undefined,
      actor: actor || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [category, action, actor, dateFrom, dateTo, debouncedSearch],
  );

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    auditService
      .list({ ...filters, page, page_size: PAGE_SIZE })
      .then((res) => {
        if (!active) return;
        setData(res.results);
        setCount(res.count);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, "No se pudo cargar el registro de actividad."));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page]);

  useEffect(() => load(), [load]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const clearFilters = () => {
    setCategory("");
    setAction("");
    setActor("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setDebouncedSearch("");
    setFiltersKey((k) => k + 1);
  };

  const hasFilters =
    !!category || !!action || !!actor || !!dateFrom || !!dateTo || !!search;

  const openDetail = (log: AuditLog) => {
    setSelected(log);
    openModal();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await auditService.exportCsv(filters);
    } catch (err) {
      setError(getApiError(err, "No se pudo exportar el registro."));
    } finally {
      setExporting(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    setBackupOk(false);
    setError(null);
    try {
      await auditService.backupDatabase();
      setBackupOk(true);
      window.setTimeout(() => setBackupOk(false), 6000);
    } catch (err) {
      setError(getApiError(err, "No se pudo generar el respaldo de la base de datos."));
    } finally {
      setBackingUp(false);
    }
  };

  const openPurge = () => {
    setPurgeBefore("");
    setPurgeError(null);
    setPurgeResult(null);
    purge.openModal();
  };

  const handlePurge = async () => {
    if (!purgeBefore) {
      setPurgeError("Indica una fecha de corte.");
      return;
    }
    setPurging(true);
    setPurgeError(null);
    try {
      const deleted = await auditService.purge(purgeBefore);
      setPurgeResult(deleted);
      load(); // refleja la limpieza
    } catch (err) {
      setPurgeError(getApiError(err, "No se pudieron purgar los registros."));
    } finally {
      setPurging(false);
    }
  };

  const actorOptions = useMemo(
    () => (meta?.actors ?? []).map((a) => ({ value: a, label: a })),
    [meta],
  );

  return (
    <>
      <PageMeta
        title="Registro de actividad del sistema"
        description="Bitácora de auditoría: qué pasó, quién lo hizo y cuándo"
      />
      <PageBreadcrumb pageTitle="Registro de actividad del sistema" />

      <ComponentCard title="Auditoría">
        <p className="-mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">
          Registro inmutable de las acciones relevantes del sistema (ventas, presupuestos,
          inventario, scrapers, reportes, usuarios, configuración y accesos). Cada fila indica
          <strong> qué se hizo, quién lo hizo y cuándo</strong>.
        </p>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Categoría</Label>
            <Select
              key={`cat-${filtersKey}`}
              options={meta?.categories ?? []}
              placeholder="Todas"
              defaultValue={category}
              onChange={setCategory}
            />
          </div>
          <div>
            <Label>Acción</Label>
            <Select
              key={`act-${filtersKey}`}
              options={meta?.actions ?? []}
              placeholder="Todas"
              defaultValue={action}
              onChange={setAction}
            />
          </div>
          <div>
            <Label>Usuario</Label>
            <Select
              key={`usr-${filtersKey}`}
              options={actorOptions}
              placeholder="Todos"
              defaultValue={actor}
              onChange={setActor}
            />
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label>Búsqueda</Label>
            <Input
              placeholder="Buscar en la descripción o usuario…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters}>
            Limpiar filtros
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || count === 0}
          >
            {exporting ? "Exportando…" : "Exportar CSV"}
          </Button>
          <Button variant="outline" size="sm" onClick={openPurge}>
            Purgar antiguos
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleBackup}
              disabled={backingUp}
            >
              {backingUp ? "Generando respaldo…" : "Respaldar base de datos (SQL)"}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(DJANGO_ADMIN_USER_ADD_URL, "_blank", "noopener,noreferrer")
              }
            >
              Crear usuarios (Admin Django)
            </Button>
          )}
        </div>

        {backupOk && (
          <div className="mt-4">
            <Alert
              variant="success"
              title="Respaldo generado"
              message="La descarga del respaldo SQL de la base de datos ha comenzado."
            />
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* Tabla */}
        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Fecha y hora", "Usuario", "Acción", "Descripción", ""].map((h) => (
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
              {loading ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Spinner /> Cargando registro…
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay registros con esos filtros." : "Aún no hay actividad registrada."}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {fmtDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {log.actor_username || "sistema"}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {log.actor_role_label || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="light" color={categoryColor(log.category)} size="sm">
                        {log.action_label}
                      </Badge>
                      <span className="mt-1 block text-xs text-gray-400">{log.category_label}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {log.description}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(log)}
                        className="text-sm font-medium text-brand-500 hover:text-brand-600"
                      >
                        Ver detalle
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {count > 0 ? `Página ${page} de ${numPages} · ${count} registro(s)` : "Sin registros"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              disabled={loading || page >= numPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </ComponentCard>

      {/* Modal de detalle */}
      <Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-2xl">
        {selected && (
          <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {selected.action_label}
              </h3>
              <Badge variant="light" color={categoryColor(selected.category)} size="sm">
                {selected.category_label}
              </Badge>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <Field label="Fecha y hora" value={fmtDateTime(selected.created_at)} />
              <Field label="Usuario" value={selected.actor_username || "sistema"} />
              <Field label="Rol" value={selected.actor_role_label || "—"} />
              <Field label="IP" value={selected.ip_address || "—"} />
              <Field
                label="Objeto afectado"
                value={selected.target_model ? `${selected.target_model} #${selected.target_id}` : "—"}
              />
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Descripción</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{selected.description}</p>
            </div>

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Detalles</p>
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de purga */}
      <Modal isOpen={purge.isOpen} onClose={purge.closeModal} className="m-4 max-w-md">
        <div className="p-6 sm:p-8">
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Purgar registros antiguos
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Elimina de forma permanente los registros <strong>anteriores</strong> a la fecha
            indicada. Esta acción no se puede deshacer y queda registrada en la propia bitácora.
          </p>

          <Label>Eliminar registros anteriores a</Label>
          <Input
            type="date"
            value={purgeBefore}
            max={todayISO()}
            onChange={(e) => setPurgeBefore(e.target.value)}
          />

          {purgeError && (
            <div className="mt-3">
              <Alert variant="error" title="No se pudo purgar" message={purgeError} />
            </div>
          )}
          {purgeResult !== null && (
            <div className="mt-3">
              <Alert
                variant="success"
                title="Purga completada"
                message={`Se eliminaron ${purgeResult} registro(s).`}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={purge.closeModal}>
              Cerrar
            </Button>
            <button
              type="button"
              onClick={handlePurge}
              disabled={purging || !purgeBefore}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-5 py-3.5 text-sm text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {purging ? "Purgando…" : "Purgar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}
