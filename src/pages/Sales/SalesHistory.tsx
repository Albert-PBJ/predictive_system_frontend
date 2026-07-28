import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
import ImpexBar from "../../components/impex/ImpexBar";
import TextArea from "../../components/form/input/TextArea";
import {
  salesService,
  SALE_STATUS_FILTERS,
  type Sale,
  type SalePayment,
} from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES, fmtDate } from "../../utils/format";
import { CAN_REGISTER_SALES, OPERATIONAL_ROLES } from "../../services/types";
import InvoiceModal from "../../components/sales/InvoiceModal";
import PaymentModal from "../../components/sales/PaymentModal";
import DispatchOrderModal from "../../components/sales/DispatchOrderModal";
import { downloadPaymentReceiptPdf } from "../../components/sales/downloadPaymentReceipt";

const PAGE_SIZE = 10;

function statusColor(status: string): "success" | "warning" | "error" | "light" {
  if (status === "COMP") return "success";
  if (status === "PEN") return "warning";
  if (status === "ANU") return "error";
  return "light";
}

export default function SalesHistory() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canVoid = hasRole("ADMIN", "MANAGER");
  // El encargado de inventario ve las ventas, pero no las registra.
  const canRegisterSales = hasRole(...CAN_REGISTER_SALES);
  // Facturar la requiere capacidad de vender; generar despacho, cualquier operativo.
  const canInvoice = canRegisterSales;
  const canDispatch = hasRole(...OPERATIONAL_ROLES);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  // Edición de notas de la venta (inline en el detalle).
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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
  // Descarga de recibo de un abono en curso (id del pago + variante) para deshabilitar
  // los enlaces mientras se genera el PDF.
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
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

  // Deep-link: al llegar con ?sale=<id> (desde un presupuesto o una orden de despacho
  // relacionada) abre directamente el detalle de esa venta y limpia el parámetro.
  useEffect(() => {
    const id = searchParams.get("sale");
    if (!id) return;
    let active = true;
    salesService
      .retrieve(Number(id))
      .then((s) => {
        if (!active) return;
        setSelected(s);
        setActionError(null);
        setEditingNotes(false);
        openModal();
        const next = new URLSearchParams(searchParams);
        next.delete("sale");
        setSearchParams(next, { replace: true });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchParams, openModal, setSearchParams]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openDetail = (sale: Sale) => {
    setSelected(sale);
    setActionError(null);
    setEditingNotes(false);
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

  const handleInvoiced = (updated: Sale) => {
    setSelected(updated); // refleja los datos fiscales en el detalle abierto
    load(); // refresca la lista (nº de factura en la tabla)
  };

  const handlePaid = (updated: Sale) => {
    setSelected(updated); // refleja la cobranza (y el nuevo estado si se completó)
    load(); // refresca la lista (el estado puede pasar a Completada)
  };

  // Descarga (reimprime) el recibo de un abono ya registrado, en la variante indicada.
  const downloadReceipt = async (payment: SalePayment, variant: "cliente" | "interno") => {
    if (!selected) return;
    const key = `${payment.id}-${variant}`;
    setReceiptBusy(key);
    try {
      await downloadPaymentReceiptPdf(selected, payment, variant);
    } finally {
      setReceiptBusy(null);
    }
  };

  const startEditNotes = () => {
    setNotesDraft(selected?.notes ?? "");
    setEditingNotes(true);
    setActionError(null);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    setActionError(null);
    try {
      const updated = await salesService.editNotes(selected.id, notesDraft.trim());
      setSelected(updated);
      setEditingNotes(false);
    } catch (err) {
      setActionError(getApiError(err, "No se pudieron guardar las notas."));
    } finally {
      setSavingNotes(false);
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

      <div className="mb-4 flex justify-end">
        <ImpexBar entity="sales" label="ventas" canImport={canRegisterSales} onImported={load} />
      </div>

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
                    {["Producto", "Cant.", "Precio lista", "Desc.", "Precio neto", "Subtotal"].map((h) => (
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
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(it.unit_list_price_usd)}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {Number(it.discount_pct) > 0 ? `${Number(it.discount_pct)}%` : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(it.unit_sale_price_usd)}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(it.subtotal_sale_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Field label="Productos (base)" value={fmtUSD(selected.total_sale_usd)} />
              {Number(selected.installation_cost_usd) > 0 && (
                <Field label="Instalación" value={fmtUSD(selected.installation_cost_usd)} />
              )}
              {Number(selected.delivery_cost_usd) > 0 && (
                <Field label="Despacho / flete" value={fmtUSD(selected.delivery_cost_usd)} />
              )}
              <Field label={`IVA (${Number(selected.iva_rate)}%)`} value={fmtUSD(selected.iva_amount_usd)} />
              <Field label="Total con IVA" value={fmtUSD(selected.total_with_iva_usd)} />
              <Field label="Total con IVA (VES)" value={fmtVES(selected.total_with_iva_ves)} />
              <Field label="Utilidad" value={fmtUSD(selected.total_profit_usd)} />
              <Field label="Comisión" value={fmtUSD(selected.commission_usd)} />
            </div>

            {/* Cobranza (abonos / saldo) */}
            {selected.status !== "ANU" && (
              <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">Cobranza</p>
                  <Badge
                    variant="light"
                    color={selected.is_fully_paid ? "success" : "warning"}
                    size="sm"
                  >
                    {selected.is_fully_paid ? "Pagada" : `Saldo ${fmtUSD(selected.balance_usd)}`}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Total con IVA" value={fmtUSD(selected.total_with_iva_usd)} />
                  <Field label="Abonado" value={fmtUSD(selected.amount_paid_usd)} />
                  <Field label="Saldo pendiente" value={fmtUSD(selected.balance_usd)} />
                </div>

                {selected.payments.length > 0 && (
                  <div className="mt-4 max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                        <TableRow>
                          {["Fecha", "Medio", "Referencia", "Monto", "Recibo"].map((h) => (
                            <TableCell key={h} isHeader className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                              {h}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selected.payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtDate(p.payment_date)}</TableCell>
                            <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{p.method_display}</TableCell>
                            <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{p.reference || "—"}</TableCell>
                            <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(p.amount_usd)}</TableCell>
                            <TableCell className="px-3 py-2 text-sm">
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => downloadReceipt(p, "cliente")}
                                  disabled={receiptBusy !== null}
                                  className="font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
                                >
                                  {receiptBusy === `${p.id}-cliente` ? "…" : "Cliente"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadReceipt(p, "interno")}
                                  disabled={receiptBusy !== null}
                                  className="font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
                                >
                                  {receiptBusy === `${p.id}-interno` ? "…" : "Interno"}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {!selected.is_fully_paid && canRegisterSales && (
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" onClick={() => setPaymentOpen(true)}>
                      Registrar abono
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Facturación fiscal */}
            <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">Facturación</p>
                <Badge variant="light" color={selected.is_invoiced ? "success" : "warning"} size="sm">
                  {selected.is_invoiced ? "Facturada" : "Sin factura"}
                </Badge>
              </div>
              {selected.is_invoiced ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="N° factura" value={selected.invoice_number || "—"} />
                  <Field label="N° control" value={selected.control_number || "—"} />
                  <Field label="Fecha factura" value={fmtDate(selected.invoice_date)} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Adjunto</p>
                    {selected.invoice_file_url ? (
                      <a
                        href={selected.invoice_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-brand-500 hover:text-brand-600"
                      >
                        Ver archivo
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">—</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Esta venta aún no tiene factura fiscal asociada.
                </p>
              )}
            </div>

            {/* Notas (editables) */}
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Notas</p>
                {!editingNotes && canRegisterSales && selected.status !== "ANU" && (
                  <button
                    type="button"
                    onClick={startEditNotes}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    {selected.notes ? "Editar" : "Agregar nota"}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <TextArea rows={3} value={notesDraft} onChange={setNotesDraft} placeholder="Observaciones" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingNotes(false)} disabled={savingNotes}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={saveNotes} disabled={savingNotes}>
                      {savingNotes ? "Guardando…" : "Guardar nota"}
                    </Button>
                  </div>
                </div>
              ) : selected.notes ? (
                <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{selected.notes}</p>
              ) : (
                <p className="text-sm text-gray-400">Sin notas.</p>
              )}
            </div>

            {actionError && (
              <div className="mt-4">
                <Alert variant="error" title="No se pudo anular" message={actionError} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>Cerrar</Button>
              {selected.source_quote && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ventas/presupuestos?quote=${selected.source_quote!.id}`)}
                >
                  Ver presupuesto {selected.source_quote.quote_number}
                </Button>
              )}
              {selected.dispatch_orders.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ventas/despachos?sale=${selected.id}`)}
                >
                  Ver despacho(s) ({selected.dispatch_orders.length})
                </Button>
              )}
              {selected.status !== "ANU" && canDispatch && (
                <Button variant="outline" onClick={() => setDispatchOpen(true)}>
                  Generar orden de despacho
                </Button>
              )}
              {selected.status !== "ANU" && canInvoice && (
                <Button onClick={() => setInvoiceOpen(true)}>
                  {selected.is_invoiced ? "Editar factura" : "Registrar factura"}
                </Button>
              )}
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

      {/* Facturar la venta seleccionada */}
      <InvoiceModal
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        sale={selected}
        onInvoiced={handleInvoiced}
      />

      {/* Registrar un abono a la venta seleccionada */}
      <PaymentModal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        sale={selected}
        onPaid={handlePaid}
      />

      {/* Generar orden de despacho de la venta seleccionada. El modal muestra su
          propia pantalla de éxito (descargar PDF / ir al listado) y se cierra solo. */}
      <DispatchOrderModal
        isOpen={dispatchOpen}
        onClose={() => setDispatchOpen(false)}
        sale={selected}
      />
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
