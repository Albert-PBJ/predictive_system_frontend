import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import TextArea from "../../components/form/input/TextArea";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { TrashBinIcon } from "../../icons";
import CustomerPicker from "../../components/sales/CustomerPicker";
import ProductPicker from "../../components/sales/ProductPicker";
import QuotePicker from "../../components/sales/QuotePicker";
import InvoiceModal from "../../components/sales/InvoiceModal";
import DispatchOrderModal from "../../components/sales/DispatchOrderModal";
import Spinner from "../../components/common/Spinner";
import { customersService, type Customer } from "../../services/customersService";
import { isService, productsService, type Product } from "../../services/productsService";
import type { Quote } from "../../services/quotesService";
import {
  salesService,
  SALE_TYPES,
  SALE_STATUSES,
  type LatestRate,
  type NewSale,
  type Sale,
} from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES, todayISO } from "../../utils/format";

interface Line {
  product: Product;
  quantity: number;
  discountPct: string; // % de descuento sobre el precio de lista (productos físicos)
  unitPrice: string; // precio unitario flexible en USD (solo servicios, p. ej. Mantenimiento)
}

// Precio de lista y precio neto por línea. Un **servicio** (Mantenimiento) no tiene
// precio de lista ni descuento: su precio se escribe a mano en cada venta.
const listPrice = (l: Line) => Number(l.product.sale_price_usd) || 0;
const netPrice = (l: Line) =>
  isService(l.product)
    ? Number(l.unitPrice) || 0
    : listPrice(l) * (1 - (Number(l.discountPct) || 0) / 100);

export default function RegisterSale() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleDate, setSaleDate] = useState(todayISO());
  const [saleType, setSaleType] = useState("RET");
  const [status, setStatus] = useState("COMP");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const [rate, setRate] = useState<LatestRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Sale | null>(null);

  // Presupuesto relacionado (opcional): al importarlo se precarga el cliente + líneas
  // y, al guardar, la venta queda enlazada al presupuesto (marcándolo convertido).
  const [linkedQuote, setLinkedQuote] = useState<Quote | null>(null);
  const [importing, setImporting] = useState(false);

  // Facturar / despachar la venta recién registrada, sin salir de la pantalla de éxito.
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  // Facturación fiscal OPCIONAL dentro del propio formulario (antes de registrar):
  // si se marca, la venta se registra y se factura en un solo paso.
  const [addInvoiceNow, setAddInvoiceNow] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceWarning, setInvoiceWarning] = useState<string | null>(null);

  const ivaPct = linkedQuote ? Number(linkedQuote.iva_rate) : 16;

  // Al activar "Registrar la factura ahora", precarga la fecha y sugiere el correlativo.
  const toggleInvoiceNow = (checked: boolean) => {
    setAddInvoiceNow(checked);
    if (!checked) return;
    if (!invoiceDate) setInvoiceDate(saleDate);
    if (!invoiceNumber && !controlNumber) {
      salesService
        .nextInvoiceNumbers()
        .then((s) => {
          setInvoiceNumber((v) => v || s.invoice_number);
          setControlNumber((v) => v || s.control_number);
        })
        .catch(() => {
          /* la sugerencia es best-effort: se pueden escribir a mano */
        });
    }
  };

  useEffect(() => {
    salesService.getLatestRate().then(setRate);
  }, []);

  // Importa un presupuesto vigente al formulario: precarga cliente y líneas (con el
  // precio cotizado, expresado como descuento sobre el precio de lista actual, o como
  // precio directo para servicios). La venta se enviará enlazada a este presupuesto.
  const importQuote = async (q: Quote) => {
    setImporting(true);
    setError(null);
    try {
      const [cust, products] = await Promise.all([
        customersService.get(q.customer),
        Promise.all(q.items.map((it) => productsService.get(it.product))),
      ]);
      const newLines: Line[] = q.items.map((it, idx) => {
        const product = products[idx];
        const quoted = Number(it.unit_price_usd) || 0;
        if (isService(product)) {
          return { product, quantity: it.quantity, discountPct: "0", unitPrice: String(quoted) };
        }
        const list = Number(product.sale_price_usd) || 0;
        const disc = list > 0 ? Math.max(0, Math.min(100, (1 - quoted / list) * 100)) : 0;
        return {
          product,
          quantity: it.quantity,
          discountPct: String(Math.round(disc * 100) / 100),
          unitPrice: "",
        };
      });
      setCustomer(cust);
      setLines(newLines);
      setSaleType("INST"); // los presupuestos suelen ser de proyecto/institucional
      setLinkedQuote(q);
    } catch (err) {
      setError(getApiError(err, "No se pudo cargar el presupuesto."));
    } finally {
      setImporting(false);
    }
  };

  // Cambio manual de cliente: si difiere del presupuesto enlazado, se desvincula (la
  // venta debe ser del mismo cliente que el presupuesto).
  const handleCustomerChange = (c: Customer | null) => {
    setCustomer(c);
    if (linkedQuote && (!c || c.id !== linkedQuote.customer)) setLinkedQuote(null);
  };

  // ── Manejo de líneas ──
  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        // Si ya está, suma una unidad. Un servicio no tiene tope de stock.
        return prev.map((l) =>
          l.product.id === p.id
            ? {
                ...l,
                quantity: isService(p) ? l.quantity + 1 : Math.min(l.quantity + 1, p.stock),
              }
            : l,
        );
      }
      return [
        ...prev,
        {
          product: p,
          quantity: 1,
          discountPct: "0",
          // El servicio arranca con su tarifa de referencia como precio editable.
          unitPrice: isService(p) ? String(p.sale_price_usd ?? "") : "",
        },
      ];
    });
  };

  const updateLine = (id: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: number) =>
    setLines((prev) => prev.filter((l) => l.product.id !== id));

  // ── Cálculos ──
  const effectiveRate = rate ? Number(rate.effective_rate) : null;

  const lineSubtotal = (l: Line) => l.quantity * netPrice(l);
  const lineDiscount = (l: Line) => l.quantity * (listPrice(l) - netPrice(l));
  const subtotalUSD = useMemo(
    () => lines.reduce((acc, l) => acc + lineSubtotal(l), 0),
    [lines],
  );
  const totalDiscountUSD = useMemo(
    () => lines.reduce((acc, l) => acc + lineDiscount(l), 0),
    [lines],
  );
  const totalVES = effectiveRate !== null ? subtotalUSD * effectiveRate : null;

  const lineError = (l: Line): string | null => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) return "Cantidad inválida";
    if (isService(l.product)) {
      const price = Number(l.unitPrice);
      if (Number.isNaN(price) || price <= 0) return "Precio inválido";
      return null;
    }
    if (l.quantity > l.product.stock) return `Solo hay ${l.product.stock} en stock`;
    const d = Number(l.discountPct);
    if (Number.isNaN(d) || d < 0 || d > 100) return "Descuento inválido (0–100%)";
    return null;
  };

  const hasLineErrors = lines.some((l) => lineError(l) !== null);
  const canSubmit = !!customer && lines.length > 0 && !hasLineErrors && !submitting;

  const handleSubmit = async () => {
    if (!customer) {
      setError("Selecciona un cliente.");
      return;
    }
    if (lines.length === 0) {
      setError("Agrega al menos un producto.");
      return;
    }
    if (addInvoiceNow && (!invoiceNumber.trim() || !controlNumber.trim())) {
      setError(
        "Para facturar ahora, ingresa el N° de factura y el N° de control " +
          "(o desmarca «Registrar la factura ahora»).",
      );
      return;
    }
    setError(null);
    setInvoiceWarning(null);
    setSubmitting(true);
    const payload: NewSale = {
      customer: customer.id,
      sale_date: saleDate,
      sale_type: saleType,
      status,
      notes: notes.trim(),
      // Relaciona la venta con el presupuesto y hereda su IVA.
      ...(linkedQuote ? { quote: linkedQuote.id, iva_rate: linkedQuote.iva_rate } : {}),
      items: lines.map((l) =>
        isService(l.product)
          ? {
              // Servicio: precio flexible escrito a mano (no hay % de descuento).
              product: l.product.id,
              quantity: l.quantity,
              unit_sale_price_usd: Number(l.unitPrice) || 0,
            }
          : {
              product: l.product.id,
              quantity: l.quantity,
              discount_pct: Number(l.discountPct) || 0,
            },
      ),
    };
    try {
      const sale = await salesService.create(payload);
      // Si se pidió facturar en el mismo paso, se factura la venta recién creada. Si
      // esto falla (p. ej. número duplicado), la venta ya quedó registrada: se muestra
      // sin factura con un aviso, y se puede reintentar con «Facturar».
      if (addInvoiceNow) {
        try {
          const invoiced = await salesService.invoiceSale(sale.id, {
            invoice_number: invoiceNumber.trim(),
            control_number: controlNumber.trim(),
            invoice_date: invoiceDate || null,
            file: invoiceFile,
          });
          setResult(invoiced);
        } catch (err) {
          setResult(sale);
          setInvoiceWarning(
            getApiError(err, "La venta se registró, pero no se pudo facturar.") +
              " Puedes reintentar con «Facturar».",
          );
        }
      } else {
        setResult(sale);
      }
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar la venta."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomer(null);
    setSaleDate(todayISO());
    setSaleType("RET");
    setStatus("COMP");
    setNotes("");
    setLines([]);
    setLinkedQuote(null);
    setAddInvoiceNow(false);
    setInvoiceNumber("");
    setControlNumber("");
    setInvoiceDate("");
    setInvoiceFile(null);
    setInvoiceWarning(null);
    setError(null);
    setResult(null);
  };

  // ── Pantalla de éxito ──
  if (result) {
    return (
      <>
        <PageMeta title="Venta registrada" description="Confirmación de venta" />
        <PageBreadcrumb pageTitle="Registrar venta" />
        <ComponentCard title={`Venta #${result.id} registrada`}>
          <Alert
            variant="success"
            title="Venta registrada correctamente"
            message={
              `Se descontó el inventario y se registró la venta a ${result.customer_name}.` +
              (linkedQuote ? ` Se relacionó con el presupuesto ${linkedQuote.quote_number} (marcado como convertido).` : "")
            }
          />
          {invoiceWarning && (
            <Alert variant="warning" title="Factura pendiente" message={invoiceWarning} />
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <Summary label="Base imponible" value={fmtUSD(result.total_sale_usd)} />
            <Summary label={`IVA (${Number(result.iva_rate)}%)`} value={fmtUSD(result.iva_amount_usd)} />
            <Summary label="Total con IVA (USD)" value={fmtUSD(result.total_with_iva_usd)} />
            <Summary label="Total con IVA (VES)" value={fmtVES(result.total_with_iva_ves)} />
            <Summary label="Utilidad (USD)" value={fmtUSD(result.total_profit_usd)} />
            <Summary label="Comisión (USD)" value={fmtUSD(result.commission_usd)} />
          </div>
          {result.is_invoiced ? (
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Facturada: N° {result.invoice_number} · control {result.control_number}. También puedes
              generar su orden de despacho.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              La venta se registró <strong>sin factura</strong>. Puedes facturarla ahora con «Facturar»
              (o más tarde desde el historial de ventas), y generar su orden de despacho.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setInvoiceOpen(true)}>
              {result.is_invoiced ? "Editar factura" : "Facturar"}
            </Button>
            <Button variant="outline" onClick={() => setDispatchOpen(true)}>
              Generar orden de despacho
            </Button>
            <Button variant="outline" onClick={resetForm}>Registrar otra venta</Button>
            <Link to="/ventas/historial">
              <Button variant="outline">Ver historial de ventas</Button>
            </Link>
          </div>
        </ComponentCard>

        {/* Facturar la venta recién registrada */}
        <InvoiceModal
          isOpen={invoiceOpen}
          onClose={() => setInvoiceOpen(false)}
          sale={result}
          onInvoiced={(updated) => setResult(updated)}
        />

        {/* Generar su orden de despacho (el modal maneja su propia pantalla de éxito) */}
        <DispatchOrderModal
          isOpen={dispatchOpen}
          onClose={() => setDispatchOpen(false)}
          sale={result}
        />
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Registrar venta"
        description="Registro de ventas con control de stock e inventario"
      />
      <PageBreadcrumb pageTitle="Registrar venta" />

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="No se pudo registrar la venta" message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ── Cliente y datos de la venta ── */}
        <div className="space-y-6 xl:col-span-2">
          <ComponentCard title="Presupuesto relacionado (opcional)">
            {linkedQuote ? (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    Presupuesto {linkedQuote.quote_number}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {linkedQuote.customer_name} · {fmtUSD(linkedQuote.total_usd)} · IVA {Number(linkedQuote.iva_rate)}%
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Al registrar la venta, el presupuesto quedará marcado como convertido y enlazado a ella.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLinkedQuote(null)} disabled={submitting}>
                  Quitar
                </Button>
              </div>
            ) : importing ? (
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Spinner /> Cargando presupuesto…
              </div>
            ) : (
              <>
                <QuotePicker onSelect={importQuote} disabled={submitting} />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Busca un presupuesto vigente para precargar el cliente y los productos, y relacionarlo con la venta.
                </p>
              </>
            )}
          </ComponentCard>

          <ComponentCard title="Cliente">
            <CustomerPicker value={customer} onChange={handleCustomerChange} disabled={submitting} />
          </ComponentCard>

          <ComponentCard title="Productos">
            <ProductPicker
              onSelect={addProduct}
              excludeIds={lines.map((l) => l.product.id)}
              disabled={submitting}
            />

            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Aún no has agregado productos. Búscalos arriba para añadirlos a la venta.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Producto", "Cantidad", "Precio lista", "Desc. % / Precio", "Precio neto", "Subtotal", ""].map((h) => (
                        <TableCell
                          key={h}
                          isHeader
                          className="px-3 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lines.map((l) => {
                      const err = lineError(l);
                      return (
                        <TableRow key={l.product.id}>
                          <TableCell className="px-3 py-3">
                            <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                              {l.product.name}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {l.product.sku ?? "—"} ·{" "}
                              {isService(l.product) ? "Servicio" : `Stock: ${l.product.stock}`}
                            </span>
                            {err && <span className="block text-xs text-error-500">{err}</span>}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <input
                              type="number"
                              min={1}
                              max={isService(l.product) ? undefined : l.product.stock}
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.product.id, {
                                  quantity: Math.floor(Number(e.target.value) || 0),
                                })
                              }
                              className="h-10 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {isService(l.product) ? "—" : fmtUSD(listPrice(l))}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            {isService(l.product) ? (
                              // Servicio: precio flexible en USD (se negocia por venta).
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={l.unitPrice}
                                placeholder="Precio USD"
                                onChange={(e) =>
                                  updateLine(l.product.id, { unitPrice: e.target.value })
                                }
                                className="h-10 w-24 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                              />
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={l.discountPct}
                                onChange={(e) =>
                                  updateLine(l.product.id, { discountPct: e.target.value })
                                }
                                className="h-10 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                              />
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {fmtUSD(netPrice(l))}
                          </TableCell>
                          <TableCell className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {fmtUSD(lineSubtotal(l))}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => removeLine(l.product.id)}
                              className="text-gray-400 transition-colors hover:text-error-500"
                              aria-label="Quitar"
                            >
                              <TrashBinIcon className="size-5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </ComponentCard>
        </div>

        {/* ── Resumen y datos de la venta ── */}
        <div className="space-y-6">
          <ComponentCard title="Datos de la venta">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <Label>Tipo de venta</Label>
              <Select options={SALE_TYPES} defaultValue={saleType} onChange={setSaleType} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select options={SALE_STATUSES} defaultValue={status} onChange={setStatus} />
            </div>
            <div>
              <Label>Notas</Label>
              <TextArea rows={3} value={notes} onChange={setNotes} placeholder="Observaciones (opcional)" />
            </div>
          </ComponentCard>

          <ComponentCard title="Facturación fiscal (opcional)">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={addInvoiceNow}
                onChange={(e) => toggleInvoiceNow(e.target.checked)}
                disabled={submitting}
                className="size-4 rounded border-gray-300"
              />
              Registrar la factura ahora
            </label>

            {addInvoiceNow ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>N° de factura fiscal</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="00000123"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <Label>N° de control (SENIAT)</Label>
                    <Input
                      value={controlNumber}
                      onChange={(e) => setControlNumber(e.target.value)}
                      placeholder="00000123"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div>
                  <Label>Fecha de emisión</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <Label>Adjunto de la factura (PDF o imagen, opcional)</Label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                    disabled={submitting}
                    className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-400"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  El IVA ({ivaPct}%) se calcula automáticamente sobre la base imponible.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Si no la marcas, la venta se registra sin factura y podrás facturarla después.
              </p>
            )}
          </ComponentCard>

          <ComponentCard title="Resumen">
            <div className="space-y-3">
              <Row label="Productos" value={`${lines.length} línea(s)`} />
              <Row label="Unidades" value={`${lines.reduce((a, l) => a + l.quantity, 0)}`} />
              {totalDiscountUSD > 0 && (
                <Row label="Descuento" value={`− ${fmtUSD(totalDiscountUSD)}`} />
              )}
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total (USD)</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    {fmtUSD(subtotalUSD)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total (VES)</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {totalVES !== null ? fmtVES(totalVES) : "—"}
                  </span>
                </div>
              </div>
              {rate ? (
                <Badge variant="light" color="info" size="sm">
                  Tasa {rate.source}: {fmtVES(rate.effective_rate)} / USD
                </Badge>
              ) : (
                <p className="text-xs text-warning-500">
                  Sin tasa de cambio cargada: el total en VES se calculará al guardar.
                </p>
              )}
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? "Registrando…" : "Registrar venta"}
            </Button>
            {!customer && (
              <p className="text-center text-xs text-gray-400">Selecciona un cliente para continuar.</p>
            )}
          </ComponentCard>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}
