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
import type { Customer } from "../../services/customersService";
import type { Product } from "../../services/productsService";
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
  unitPrice: string;
}

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

  useEffect(() => {
    salesService.getLatestRate().then(setRate);
  }, []);

  // ── Manejo de líneas ──
  const addProduct = (p: Product) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) {
        // Si ya está, intenta sumar una unidad sin pasar del stock.
        return prev.map((l) =>
          l.product.id === p.id
            ? { ...l, quantity: Math.min(l.quantity + 1, p.stock) }
            : l,
        );
      }
      return [...prev, { product: p, quantity: 1, unitPrice: p.sale_price_usd }];
    });
  };

  const updateLine = (id: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.product.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: number) =>
    setLines((prev) => prev.filter((l) => l.product.id !== id));

  // ── Cálculos ──
  const effectiveRate = rate ? Number(rate.effective_rate) : null;

  const lineSubtotal = (l: Line) => l.quantity * (Number(l.unitPrice) || 0);
  const subtotalUSD = useMemo(
    () => lines.reduce((acc, l) => acc + lineSubtotal(l), 0),
    [lines],
  );
  const totalVES = effectiveRate !== null ? subtotalUSD * effectiveRate : null;

  const lineError = (l: Line): string | null => {
    if (!Number.isInteger(l.quantity) || l.quantity < 1) return "Cantidad inválida";
    if (l.quantity > l.product.stock) return `Solo hay ${l.product.stock} en stock`;
    if (Number(l.unitPrice) < 0 || Number.isNaN(Number(l.unitPrice))) return "Precio inválido";
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
    const payload: NewSale = {
      customer: customer.id,
      sale_date: saleDate,
      sale_type: saleType,
      status,
      notes: notes.trim(),
      items: lines.map((l) => ({
        product: l.product.id,
        quantity: l.quantity,
        unit_sale_price_usd: l.unitPrice,
      })),
    };
    try {
      const sale = await salesService.create(payload);
      setResult(sale);
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
            message={`Se descontó el inventario y se registró la venta a ${result.customer_name}.`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary label="Total (USD)" value={fmtUSD(result.total_sale_usd)} />
            <Summary label="Total (VES)" value={fmtVES(result.total_sale_ves)} />
            <Summary label="Utilidad (USD)" value={fmtUSD(result.total_profit_usd)} />
            <Summary label="Comisión (USD)" value={fmtUSD(result.commission_usd)} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={resetForm}>Registrar otra venta</Button>
            <Link to="/ventas/historial">
              <Button variant="outline">Ver historial de ventas</Button>
            </Link>
          </div>
        </ComponentCard>
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
          <ComponentCard title="Cliente">
            <CustomerPicker value={customer} onChange={setCustomer} disabled={submitting} />
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
                              {l.product.sku ?? "—"} · Stock: {l.product.stock}
                            </span>
                            {err && <span className="block text-xs text-error-500">{err}</span>}
                          </TableCell>
                          <TableCell className="px-3 py-3">
                            <input
                              type="number"
                              min={1}
                              max={l.product.stock}
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.product.id, {
                                  quantity: Math.floor(Number(e.target.value) || 0),
                                })
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
                              onChange={(e) =>
                                updateLine(l.product.id, { unitPrice: e.target.value })
                              }
                              className="h-10 w-28 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                            />
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

          <ComponentCard title="Resumen">
            <div className="space-y-3">
              <Row label="Productos" value={`${lines.length} línea(s)`} />
              <Row label="Unidades" value={`${lines.reduce((a, l) => a + l.quantity, 0)}`} />
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
