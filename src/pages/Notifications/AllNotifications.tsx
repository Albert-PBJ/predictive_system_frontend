import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  notificationsService,
  type AlertSeverity,
  type AppNotification,
} from "../../services/notificationsService";
import { fmtDateTime } from "../../utils/format";

// Roles que pueden disparar el barrido predictivo (espejo de la audiencia backend).
const SCAN_ROLES = ["ADMIN", "MANAGER", "WAREHOUSE"] as const;

function sevColor(s: AlertSeverity): "error" | "warning" | "info" {
  return s === "CRIT" ? "error" : s === "WARN" ? "warning" : "info";
}

type EstadoFiltro = "" | "unread" | "read" | "resolved" | "active";

export default function AllNotifications() {
  const { role } = useAuth();
  const { notifications, loading, refresh, markAllRead } = useNotifications();

  const [tipo, setTipo] = useState("");
  const [severidad, setSeveridad] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("");
  const [search, setSearch] = useState("");
  const [filtersKey, setFiltersKey] = useState(0); // remonta los Select al limpiar
  const [scanning, setScanning] = useState(false);

  const canScan = !!role && (SCAN_ROLES as readonly string[]).includes(role);

  // Al entrar, refresca el feed (además del sondeo del contexto).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opciones de tipo presentes en el feed actual.
  const typeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of notifications) seen.set(n.type, n.type_label);
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [notifications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (tipo && n.type !== tipo) return false;
      if (severidad && n.severity !== severidad) return false;
      if (estado === "unread" && n.read) return false;
      if (estado === "read" && !n.read) return false;
      if (estado === "resolved" && !n.is_resolved) return false;
      if (estado === "active" && n.is_resolved) return false;
      if (q && !(`${n.title} ${n.message}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [notifications, tipo, severidad, estado, search]);

  const hasFilters = !!tipo || !!severidad || !!estado || !!search;
  const clearFilters = () => {
    setTipo("");
    setSeveridad("");
    setEstado("");
    setSearch("");
    setFiltersKey((k) => k + 1);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await notificationsService.scan();
      await refresh();
    } catch {
      // best-effort
    } finally {
      setScanning(false);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <PageMeta
        title="Notificaciones"
        description="Todas tus alertas del sistema con su fecha y detalle"
      />
      <PageBreadcrumb pageTitle="Notificaciones" />

      <ComponentCard title="Tus notificaciones">
        <p className="-mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">
          Alertas dirigidas a tu rol: quiebres de stock (reales y <strong>previstos</strong>),
          sobrestock, caídas de demanda, cambios de precio de la competencia y tasa de cambio
          desactualizada. Cada fila muestra <strong>qué pasó y cuándo</strong>.
        </p>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Tipo</Label>
            <Select
              key={`tipo-${filtersKey}`}
              options={typeOptions}
              placeholder="Todos"
              defaultValue={tipo}
              onChange={setTipo}
            />
          </div>
          <div>
            <Label>Severidad</Label>
            <Select
              key={`sev-${filtersKey}`}
              options={[
                { value: "CRIT", label: "Crítico" },
                { value: "WARN", label: "Advertencia" },
                { value: "INFO", label: "Información" },
              ]}
              placeholder="Todas"
              defaultValue={severidad}
              onChange={setSeveridad}
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              key={`est-${filtersKey}`}
              options={[
                { value: "unread", label: "No leídas" },
                { value: "read", label: "Leídas" },
                { value: "active", label: "Activas" },
                { value: "resolved", label: "Resueltas" },
              ]}
              placeholder="Todos"
              defaultValue={estado}
              onChange={(v) => setEstado(v as EstadoFiltro)}
            />
          </div>
          <div>
            <Label>Búsqueda</Label>
            <Input
              placeholder="Buscar en título o mensaje…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters}>
            Limpiar filtros
          </Button>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAllRead()} disabled={unread === 0}>
            Marcar todas como leídas
          </Button>
          {canScan && (
            <Button variant="primary" size="sm" onClick={handleScan} disabled={scanning}>
              {scanning ? "Analizando…" : "Analizar ahora"}
            </Button>
          )}
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {unread > 0 ? `${unread} sin leer` : "Todo al día"}
          </span>
        </div>

        {/* Tabla */}
        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Fecha y hora", "Notificación", "Tipo", "Severidad", "Estado"].map((h) => (
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
              {loading && notifications.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Spinner /> Cargando notificaciones…
                    </div>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters
                      ? "No hay notificaciones con esos filtros."
                      : "No tienes notificaciones."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((n) => <NotifRow key={n.id} n={n} />)
              )}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>
    </>
  );
}

function NotifRow({ n }: { n: AppNotification }) {
  return (
    <TableRow className={n.read ? undefined : "bg-brand-50/40 dark:bg-brand-500/5"}>
      <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {fmtDateTime(n.created_at)}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm">
        <span className="flex items-center gap-2">
          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
          <span className="font-medium text-gray-800 dark:text-white/90">{n.title}</span>
        </span>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{n.message}</span>
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
        {n.type_label}
      </TableCell>
      <TableCell className="px-4 py-3">
        <Badge variant="light" color={sevColor(n.severity)} size="sm">
          {n.severity_label}
        </Badge>
      </TableCell>
      <TableCell className="px-4 py-3 whitespace-nowrap text-xs">
        {n.is_resolved ? (
          <span className="text-success-500">Resuelta</span>
        ) : n.read ? (
          <span className="text-gray-400">Leída</span>
        ) : (
          <span className="font-medium text-brand-500">Nueva</span>
        )}
      </TableCell>
    </TableRow>
  );
}
