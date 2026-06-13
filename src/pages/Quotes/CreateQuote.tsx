import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
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
import { downloadQuotePdf } from "../../components/quotes/downloadQuote";
import type { Customer } from "../../services/customersService";
import type { Product } from "../../services/productsService";
import {
  quotesService,
  QUOTE_STATUSES,
  type NewQuote,
  type Quote,
} from "../../services/quotesService";
import { salesService, type LatestRate } from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES, todayISO } from "../../utils/format";

interface Line {
  product: Product;
  quantity: number;
  unitPrice: string; // precio unitario en USD (editable, arranca en el de lista)
}

export default function CreateQuote() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [issuedDate, setIssuedDate] = useState(todayISO());
  const [expiryDate, setExpiryDate] = useState("");
  const [ivaRate, setIvaRate] = useState("16");
  const [statusValue, setStatusValue] = useState("DRA");
  const [installation, setInstallation] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const [rate, setRate] = useState<LatestRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Quote | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    salesService.getLatestRate().then(setRate);
  }, []);

  // ── Manejo de líneas ──
  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product: p, quantity: 1, unitPrice: String(p.sale_price_usd ?? "") }];
    });
  };
  const updateLine = (id: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: number) => setLines((prev) => prev.filter((l) => l.product.id !== id));

  // ── Cálculos ──
  const effectiveRate = rate ? Number(rate.effective_rate) : null;
  const lineTotal = (l: Line) => l.quantity * (Number(l.unitPrice) || 0);
  const subtotalUSD = useMemo(() => lines.reduce((a, l) => a + lineTotal(l), 0), [lines]);
  const ivaPct = Number(ivaRate) || 0;
  const ivaUSD = (subtotalUSD * ivaPct) / 100;
  const totalUSD = subtotalUSD + ivaUSD;
  const totalVES = effectiveRate !== null ? totalUSD * effectiveRate : null;

  const lineError = (l: Line): string | null => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) return "Cantidad inválida";
    const price = Number(l.unitPrice);
    if (Number.isNaN(price) || price < 0) return "Precio inválido";
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
    setError(null);
    setSubmitting(true);
    const payload: NewQuote = {
      customer: customer.id,
      issued_date: issuedDate,
      expiry_date: expiryDate || null,
      iva_rate: Number(ivaRate) || 0,
      includes_installation: installation,
      includes_delivery: delivery,
      status: statusValue,
      items: lines.map((l) => ({
        product: l.product.id,
        quantity: l.quantity,
        unit_price_usd: Number(l.unitPrice) || 0,
      })),
    };
    try {
      const quote = await quotesService.create(payload);
      setResult(quote);
    } catch (err) {
      setError(getApiError(err, "No se pudo crear el presupuesto."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomer(null);
    setIssuedDate(todayISO());
    setExpiryDate("");
    setIvaRate("16");
    setStatusValue("DRA");
    setInstallation(false);
    setDelivery(false);
    setLines([]);
    setError(null);
    setResult(null);
  };

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadQuotePdf(result);
    } finally {
      setDownloading(false);
    }
  };

  // ── Pantalla de éxito ──
  if (result) {
    return (
      <>
        <PageMeta title="Presupuesto creado" description="Confirmación de presupuesto" />
        <PageBreadcrumb pageTitle="Nuevo presupuesto" />
        <ComponentCard title={`Presupuesto ${result.quote_number} creado`}>
          <Alert
            variant="success"
            title="Presupuesto creado correctamente"
            message={`Presupuesto ${result.quote_number} para ${result.customer_name}. Descárgalo en PDF para enviarlo al cliente.`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary label="Subtotal (USD)" value={fmtUSD(result.subtotal_usd)} />
            <Summary label={`IVA (${Number(result.iva_rate)}%)`} value={fmtUSD(result.iva_amount_usd)} />
            <Summary label="Total (USD)" value={fmtUSD(result.total_usd)} />
            <Summary label="Total (VES)" value={fmtVES(result.total_ves)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? "Generando PDF…" : "Descargar PDF"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Crear otro presupuesto
            </Button>
            <Link to="/ventas/presupuestos">
              <Button variant="outline">Ver presupuestos</Button>
            </Link>
          </div>
        </ComponentCard>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Nuevo presupuesto" description="Crear un presupuesto y descargarlo en PDF" />
      <PageBreadcrumb pageTitle="Nuevo presupuesto" />

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="No se pudo crear el presupuesto" message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <ComponentCard title="Cliente">
            <CustomerPicker value={customer} onChange={setCustomer} disabled={submitting} />
          </ComponentCard>

          <ComponentCard title="Productos">
            <ProductPicker
              onSelect={addProduct}
              excludeIds={lines.map((l) => l.product.id)}
              disabled={submitting}
              allowOutOfStock
            />

            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Aún no has agregado productos. Búscalos arriba para añadirlos al presupuesto.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Producto", "Cantidad", "Precio unit. (USD)", "Subtotal", ""].map((h) => (
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
                              {l.product.sku ?? "—"}
                            </span>
                            {err && <span className="block text-xs text-error-500">{err}</span>}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <input
                              type="number"
                              min={1}
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.product.id, { quantity: Math.floor(Number(e.target.value) || 0) })
                              }
                              className="h-10 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={l.unitPrice}
                              onChange={(e) => updateLine(l.product.id, { unitPrice: e.target.value })}
                              className="h-10 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {fmtUSD(lineTotal(l))}
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

        <div className="space-y-6">
          <ComponentCard title="Datos del presupuesto">
            <div>
              <Label>Fecha de emisión</Label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <Label>Válido hasta (opcional)</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <Label>IVA (%)</Label>
              <Input type="number" min="0" max="100" step={0.01} value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} disabled={submitting} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select options={QUOTE_STATUSES} defaultValue={statusValue} onChange={setStatusValue} />
            </div>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={installation} onChange={(e) => setInstallation(e.target.checked)} className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20" />
                Incluye instalación
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20" />
                Incluye despacho / flete
              </label>
            </div>
          </ComponentCard>

          <ComponentCard title="Resumen">
            <div className="space-y-3">
              <Row label="Productos" value={`${lines.length} línea(s)`} />
              <Row label="Unidades" value={`${lines.reduce((a, l) => a + l.quantity, 0)}`} />
              <Row label="Subtotal (USD)" value={fmtUSD(subtotalUSD)} />
              <Row label={`IVA (${ivaPct}%)`} value={fmtUSD(ivaUSD)} />
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total (USD)</span>
                  <span className="text-lg font-semibold text-gray-800 dark:text-white/90">{fmtUSD(totalUSD)}</span>
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
              {submitting ? "Creando…" : "Crear presupuesto"}
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
