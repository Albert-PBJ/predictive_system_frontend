import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import { salesService, type Sale } from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtVES } from "../../utils/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onInvoiced: (updated: Sale) => void;
}

// Modal para facturar una venta: captura el número de factura fiscal, el número de
// control (SENIAT) y, opcionalmente, el adjunto de la factura. El desglose de IVA se
// muestra como referencia (ya viene calculado en la venta). Los números se
// pre-rellenan con el siguiente correlativo sugerido por el backend.
export default function InvoiceModal({ isOpen, onClose, sale, onInvoiced }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [controlNumber, setControlNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sale) return;
    setError(null);
    setFile(null);
    setInvoiceDate(sale.invoice_date || sale.sale_date);
    // Si ya está facturada, precarga sus datos; si no, sugiere el siguiente correlativo.
    if (sale.is_invoiced) {
      setInvoiceNumber(sale.invoice_number || "");
      setControlNumber(sale.control_number || "");
    } else {
      setInvoiceNumber("");
      setControlNumber("");
      salesService
        .nextInvoiceNumbers()
        .then((s) => {
          setInvoiceNumber((prev) => prev || s.invoice_number);
          setControlNumber((prev) => prev || s.control_number);
        })
        .catch(() => {
          /* la sugerencia es best-effort: el usuario puede escribirlos a mano */
        });
    }
  }, [isOpen, sale]);

  if (!sale) return null;

  const handleSave = async () => {
    setError(null);
    if (!invoiceNumber.trim()) {
      setError("Ingresa el número de factura.");
      return;
    }
    if (!controlNumber.trim()) {
      setError("Ingresa el número de control.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await salesService.invoiceSale(sale.id, {
        invoice_number: invoiceNumber.trim(),
        control_number: controlNumber.trim(),
        invoice_date: invoiceDate || null,
        file,
      });
      onInvoiced(updated);
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo facturar la venta."));
    } finally {
      setSubmitting(false);
    }
  };

  const ivaPct = Number(sale.iva_rate) || 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg">
      <div className="p-6 sm:p-8">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {sale.is_invoiced ? "Editar factura" : "Facturar venta"} #{sale.id}
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{sale.customer_name}</p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo facturar" message={error} />
          </div>
        )}

        {/* Desglose de IVA (referencia, ya calculado en la venta) */}
        <div className="mb-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Base imponible</span>
            <span className="text-gray-800 dark:text-white/90">{fmtUSD(sale.total_sale_usd)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">IVA ({ivaPct}%)</span>
            <span className="text-gray-800 dark:text-white/90">{fmtUSD(sale.iva_amount_usd)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-semibold dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Total con IVA</span>
            <span className="text-gray-900 dark:text-white">
              {fmtUSD(sale.total_with_iva_usd)}
              {sale.total_with_iva_ves ? (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({fmtVES(sale.total_with_iva_ves)})
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>N° de factura fiscal</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="00000123" />
            </div>
            <div>
              <Label>N° de control (SENIAT)</Label>
              <Input value={controlNumber} onChange={(e) => setControlNumber(e.target.value)} placeholder="00000123" />
            </div>
          </div>
          <div>
            <Label>Fecha de emisión</Label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <Label>Adjunto de la factura (PDF o imagen, opcional)</Label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/10 dark:file:text-brand-400"
            />
            {sale.invoice_file_url && !file && (
              <a
                href={sale.invoice_file_url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-medium text-brand-500 hover:text-brand-600"
              >
                Ver factura adjunta actual
              </a>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Guardando…" : sale.is_invoiced ? "Guardar cambios" : "Facturar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
