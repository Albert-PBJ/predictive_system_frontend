import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import TextArea from "../../components/form/input/TextArea";
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
  dispatchService,
  DISPATCH_STATUSES,
  dispatchStatusColor,
  type DispatchOrder,
} from "../../services/dispatchService";
import { getApiError } from "../../services/apiError";
import { fmtDate } from "../../utils/format";
import { OPERATIONAL_ROLES } from "../../services/types";
import { downloadDispatchPdf } from "../../components/dispatch/downloadDispatch";

const PAGE_SIZE = 10;

export default function DispatchOrders() {
  const { hasRole } = useAuth();
  const canManage = hasRole(...OPERATIONAL_ROLES);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Filtro por venta (deep-link desde el detalle de una venta: ?sale=<id>).
  const saleFilter = searchParams.get("sale");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<DispatchOrder[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<DispatchOrder | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, saleFilter]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    dispatchService
      .list({
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        sale: saleFilter ? Number(saleFilter) : undefined,
      })
      .then((res) => {
        if (!active) return;
        setData(res.results);
        setCount(res.count);
      })
      .catch((err) => {
        if (active) setError(getApiError(err, "No se pudieron cargar las órdenes de despacho."));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter, saleFilter]);

  useEffect(() => load(), [load]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openDetail = (order: DispatchOrder) => {
    setSelected(order);
    setNewStatus(order.status);
    setReceivedBy(order.received_by || "");
    setDispatchDate(order.dispatch_date || "");
    setActionError(null);
    openModal();
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    setActionError(null);
    try {
      const updated = await dispatchService.updateStatus(selected.id, {
        status: newStatus,
        received_by: receivedBy.trim(),
        dispatch_date: dispatchDate || null,
      });
      setSelected(updated);
      load();
    } catch (err) {
      setActionError(getApiError(err, "No se pudo actualizar la orden."));
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
    setFiltersKey((k) => k + 1);
  };

  const clearSaleFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("sale");
    setSearchParams(next, { replace: true });
  };

  const hasFilters = !!search || !!statusFilter;

  return (
    <>
      <PageMeta title="Órdenes de despacho" description="Control de entregas de mercancía" />
      <PageBreadcrumb pageTitle="Órdenes de despacho" />

      <ComponentCard title="Órdenes de despacho">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input
              placeholder="Buscar por N° de orden o cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              key={`status-${filtersKey}`}
              options={DISPATCH_STATUSES}
              placeholder="Todos"
              defaultValue={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters} className="w-full">
              Limpiar
            </Button>
          </div>
        </div>

        {saleFilter && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
            <span className="text-gray-700 dark:text-gray-300">
              Mostrando las órdenes de despacho de la venta #{saleFilter}.
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/ventas/historial?sale=${saleFilter}`)}>
                Ver venta
              </Button>
              <Button variant="outline" size="sm" onClick={clearSaleFilter}>
                Ver todas
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Error al cargar" message={error} />
          </div>
        )}

        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["N° orden", "Venta", "Cliente", "Fecha despacho", "Estado", ""].map((h) => (
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
                      <Spinner /> Cargando órdenes…
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay órdenes con esos filtros." : "Aún no hay órdenes de despacho."}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{o.order_number}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">#{o.sale}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{o.customer_name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(o.dispatch_date)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="light" color={dispatchStatusColor(o.status)} size="sm">
                        {o.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDetail(o)}
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

        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {count > 0 ? `Página ${page} de ${numPages} · ${count} orden(es)` : "Sin órdenes"}
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
                Orden {selected.order_number}
              </h3>
              <Badge variant="light" color={dispatchStatusColor(selected.status)} size="sm">
                {selected.status_display}
              </Badge>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Field label="Venta" value={`#${selected.sale}`} />
              <Field label="Cliente" value={selected.customer_name} />
              <Field label="Vendedor" value={selected.seller_name} />
              <Field label="Fecha despacho" value={fmtDate(selected.dispatch_date)} />
              <Field label="Transporte" value={selected.carrier || "—"} />
              <Field label="Generada por" value={selected.created_by_name} />
            </div>

            {selected.delivery_address && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Dirección de entrega</p>
                <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{selected.delivery_address}</p>
              </div>
            )}

            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Producto", "SKU", "Cantidad"].map((h) => (
                      <TableCell key={h} isHeader className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {selected.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-white/90">{it.product_name}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{it.product_sku ?? "—"}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{it.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cambiar estado */}
            {canManage && selected.status !== "ANU" && (
              <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">Actualizar estado</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Estado</Label>
                    <Select
                      key={`st-${selected.id}`}
                      options={DISPATCH_STATUSES}
                      defaultValue={newStatus}
                      onChange={setNewStatus}
                    />
                  </div>
                  <div>
                    <Label>Fecha despacho</Label>
                    <Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Recibido por</Label>
                    <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Nombre de quien recibe" />
                  </div>
                </div>
                {selected.notes && (
                  <div className="mt-3">
                    <Label>Notas</Label>
                    <TextArea rows={2} value={selected.notes} onChange={() => {}} disabled />
                  </div>
                )}
              </div>
            )}

            {actionError && (
              <div className="mt-4">
                <Alert variant="error" title="No se pudo actualizar" message={actionError} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>Cerrar</Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/ventas/historial?sale=${selected.sale}`)}
              >
                Ver venta #{selected.sale}
              </Button>
              <Button variant="outline" onClick={() => downloadDispatchPdf(selected)}>Descargar PDF</Button>
              {canManage && selected.status !== "ANU" && (
                <Button onClick={handleSaveStatus} disabled={saving}>
                  {saving ? "Guardando…" : "Guardar estado"}
                </Button>
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
