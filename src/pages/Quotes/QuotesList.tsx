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
import { downloadQuotePdf } from "../../components/quotes/downloadQuote";
import {
  quotesService,
  QUOTE_STATUS_FILTERS,
  type Quote,
} from "../../services/quotesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES, fmtDate } from "../../utils/format";
import { CAN_REGISTER_SALES } from "../../services/types";

const PAGE_SIZE = 10;

function statusColor(status: string): "success" | "warning" | "error" | "info" | "light" {
  if (status === "APR" || status === "CON") return "success";
  if (status === "SEN") return "info";
  if (status === "REJ") return "error";
  if (status === "DRA") return "light";
  return "light";
}

export default function QuotesList() {
  const { hasRole } = useAuth();
  const canCreate = hasRole(...CAN_REGISTER_SALES);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Quote[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Quote | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);
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
    quotesService
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
        if (active) setError(getApiError(err, "No se pudieron cargar los presupuestos."));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => load(), [load]);

  // Deep-link: al llegar con ?quote=<id> (p. ej. desde una venta relacionada) abre
  // directamente el detalle de ese presupuesto y limpia el parámetro.
  useEffect(() => {
    const id = searchParams.get("quote");
    if (!id) return;
    let active = true;
    quotesService
      .retrieve(Number(id))
      .then((q) => {
        if (!active) return;
        setSelected(q);
        setConvertMsg(null);
        setConvertError(null);
        openModal();
        const next = new URLSearchParams(searchParams);
        next.delete("quote");
        setSearchParams(next, { replace: true });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [searchParams, openModal, setSearchParams]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openDetail = (q: Quote) => {
    setSelected(q);
    setConvertMsg(null);
    setConvertError(null);
    openModal();
  };

  const handleConvert = async () => {
    if (!selected) return;
    setConverting(true);
    setConvertMsg(null);
    setConvertError(null);
    try {
      const res = await quotesService.convertToSale(selected.id);
      setSelected(res.quote); // refleja el estado "Convertido" + el enlace a la venta
      setConvertMsg(
        `Se generó la venta #${res.sale.id} por ${fmtUSD(res.sale.total_with_iva_usd)} (IVA incluido). ` +
          `El inventario ya fue descontado.`,
      );
      load(); // refresca la lista para mostrar el nuevo estado
    } catch (err) {
      setConvertError(getApiError(err, "No se pudo convertir el presupuesto en venta."));
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async (q: Quote) => {
    setDownloadingId(q.id);
    try {
      await downloadQuotePdf(q);
    } finally {
      setDownloadingId(null);
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
      <PageMeta title="Presupuestos" description="Listado y creación de presupuestos" />
      <PageBreadcrumb pageTitle="Presupuestos" />

      <ComponentCard title="Presupuestos">
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input
              placeholder="Buscar por cliente o número…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              key={`status-${filtersKey}`}
              options={QUOTE_STATUS_FILTERS}
              placeholder="Todos"
              defaultValue={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters} className="w-full">
              Limpiar
            </Button>
            {canCreate && (
              <Link to="/ventas/presupuestos/nuevo" className="w-full">
                <Button size="sm" className="w-full">Nuevo presupuesto</Button>
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
                {["N°", "Fecha", "Cliente", "Vendedor", "Total (USD)", "Total (VES)", "Estado", ""].map((h) => (
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
                      <Spinner /> Cargando presupuestos…
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay presupuestos con esos filtros." : "Aún no hay presupuestos. Crea el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{q.quote_number}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(q.issued_date)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{q.customer_name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{q.seller_name || "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(q.total_usd)}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtVES(q.total_ves)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="light" color={statusColor(q.status)} size="sm">
                        {q.status_display}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openDetail(q)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(q)}
                          disabled={downloadingId === q.id}
                          className="text-sm font-medium text-gray-600 hover:text-brand-600 disabled:opacity-50 dark:text-gray-300"
                        >
                          {downloadingId === q.id ? "Generando…" : "PDF"}
                        </button>
                      </div>
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
            {count > 0 ? `Página ${page} de ${numPages} · ${count} presupuesto(s)` : "Sin presupuestos"}
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
                Presupuesto {selected.quote_number}
              </h3>
              <Badge variant="light" color={statusColor(selected.status)} size="sm">
                {selected.status_display}
              </Badge>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <Field label="Cliente" value={selected.customer_name} />
              <Field label="Vendedor" value={selected.seller_name || "—"} />
              <Field label="Emitido" value={fmtDate(selected.issued_date)} />
              <Field label="Válido hasta" value={selected.expiry_date ? fmtDate(selected.expiry_date) : "—"} />
            </div>

            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Producto", "Cant.", "Precio unit.", "Total"].map((h) => (
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
                      <TableCell className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(it.unit_price_usd)}</TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{fmtUSD(it.line_total_usd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Subtotal" value={fmtUSD(selected.subtotal_usd)} />
              <Field label={`IVA (${Number(selected.iva_rate)}%)`} value={fmtUSD(selected.iva_amount_usd)} />
              <Field label="Total (USD)" value={fmtUSD(selected.total_usd)} />
              <Field label="Total (VES)" value={fmtVES(selected.total_ves)} />
            </div>

            {(selected.includes_installation || selected.includes_delivery) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.includes_installation && (
                  <Badge variant="light" color="info" size="sm">Incluye instalación</Badge>
                )}
                {selected.includes_delivery && (
                  <Badge variant="light" color="info" size="sm">Incluye despacho</Badge>
                )}
              </div>
            )}

            {selected.converted_to_sale && (
              <div className="mt-4">
                <Badge variant="light" color="success" size="sm">
                  Convertido a la venta #{selected.converted_to_sale}
                </Badge>
              </div>
            )}

            {convertMsg && (
              <div className="mt-4">
                <Alert variant="success" title="Presupuesto convertido" message={convertMsg} />
              </div>
            )}
            {convertError && (
              <div className="mt-4">
                <Alert variant="error" title="No se pudo convertir" message={convertError} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>Cerrar</Button>
              <Button
                variant="outline"
                onClick={() => handleDownload(selected)}
                disabled={downloadingId === selected.id}
              >
                {downloadingId === selected.id ? "Generando PDF…" : "Descargar PDF"}
              </Button>
              {selected.converted_to_sale && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/ventas/historial?sale=${selected.converted_to_sale}`)}
                >
                  Ver venta #{selected.converted_to_sale}
                </Button>
              )}
              {canCreate &&
                selected.status !== "CON" &&
                selected.status !== "REJ" &&
                !selected.converted_to_sale && (
                  <Button onClick={handleConvert} disabled={converting}>
                    {converting ? "Convirtiendo…" : "Convertir a venta"}
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
