import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
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
import {
  salesService,
  SALE_STATUS_FILTERS,
  type Sale,
} from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES, fmtDate } from "../../utils/format";
import { CAN_REGISTER_SALES } from "../../services/types";

const PAGE_SIZE = 10;

function statusColor(status: string): "success" | "warning" | "error" | "light" {
  if (status === "COMP") return "success";
  if (status === "PEN") return "warning";
  if (status === "ANU") return "error";
  return "light";
}

export default function SalesHistory() {
  const { hasRole } = useAuth();
  const canVoid = hasRole("ADMIN", "MANAGER");
  // El encargado de inventario ve las ventas, pero no las registra.
  const canRegisterSales = hasRole(...CAN_REGISTER_SALES);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Sale[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    salesService
      .list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
      })
      .then((res) => {
        if (!active) return;
        setData(res.results);
        setCount(res.count);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, "No se pudieron cargar las ventas."));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => load(), [load]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openDetail = (sale: Sale) => {
    setSelected(sale);
    setActionError(null);
    openModal();
  };

  const handleVoid = async () => {
    if (!selected) return;
    setVoiding(true);
    setActionError(null);
    try {
      const updated = await salesService.voidSale(selected.id);
      setSelected(updated);
      load(); // refresca la lista para reflejar el nuevo estado
    } catch (err) {
      setActionError(getApiError(err, "No se pudo anular la venta."));
    } finally {
      setVoiding(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setFiltersKey((k) => k + 1);
  };

  const hasFilters = !!search || !!statusFilter;

  return (
    <>
      <PageMeta title="Historial de ventas" description="Listado de ventas registradas" />
      <PageBreadcrumb pageTitle="Historial de ventas" />

      <ComponentCard title="Ventas registradas">
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input
              placeholder="Buscar por cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              key={`status-${filtersKey}`}
              options={SALE_STATUS_FILTERS}
              placeholder="Todos"
              defaultValue={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters} className="w-full">
              Limpiar
            </Button>
            {canRegisterSales && (
              <Link to="/ventas/registrar" className="w-full">
                <Button size="sm" className="w-full">Nueva venta</Button>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Error al cargar" message={error} />
          </div>
        )}

        {/* Tabla */}
        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["#", "Fecha", "Cliente", "Vendedor", "Total (USD)", "Total (VES)", "Estado", ""].map((h) => (
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
                      <Spinner /> Cargando ventas…
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay ventas con esos filtros." : "Aún no hay ventas registradas."}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">#{s.id}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(s.sale_date)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{s.customer_name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{s.seller_name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(s.total_sale_usd)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtVES(s.total_sale_ves)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="light" color={statusColor(s.status)} size="sm">
                        {s.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(s)}
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
            {count > 0 ? `Página ${page} de ${numPages} · ${count} venta(s)` : "Sin ventas"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={loading || page >= numPages}>
              Siguiente
            </Button>
          </div>
        </div>
      </ComponentCard>

      {/* Modal de detalle */}
      <Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-2xl">
        {selected && (
          <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Venta #{selected.id}
              </h3>
              <Badge variant="light" color={statusColor(selected.status)} size="sm">
                {selected.status_display}
              </Badge>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <Field label="Cliente" value={selected.customer_name} />
              <Field label="Vendedor" value={selected.seller_name} />
              <Field label="Fecha" value={fmtDate(selected.sale_date)} />
              <Field label="Tipo" value={selected.sale_type_display} />
            </div>

            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Producto", "Cant.", "Precio unit.", "Subtotal"].map((h) => (
                      <TableCell key={h} isHeader className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selected.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-white/90">
                        {it.product_name}
                        <span className="block text-xs text-gray-400">{it.product_sku ?? "—"}</span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{it.quantity}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(it.unit_sale_price_usd)}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(it.subtotal_sale_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Total (USD)" value={fmtUSD(selected.total_sale_usd)} />
              <Field label="Total (VES)" value={fmtVES(selected.total_sale_ves)} />
              <Field label="Utilidad" value={fmtUSD(selected.total_profit_usd)} />
              <Field label="Comisión" value={fmtUSD(selected.commission_usd)} />
            </div>

            {selected.notes && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notas</p>
                <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
              </div>
            )}

            {actionError && (
              <div className="mt-4">
                <Alert variant="error" title="No se pudo anular" message={actionError} />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>Cerrar</Button>
              {canVoid && selected.status !== "ANU" && (
                <button
                  type="button"
                  onClick={handleVoid}
                  disabled={voiding}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-5 py-3.5 text-sm text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {voiding ? "Anulando…" : "Anular venta"}
                </button>
              )}
            </div>
          </div>
        )}
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
