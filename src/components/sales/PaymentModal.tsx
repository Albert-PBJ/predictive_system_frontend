import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import {
  salesService,
  PAYMENT_METHODS,
  type Sale,
} from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, todayISO } from "../../utils/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onPaid: (updated: Sale) => void;
}

// Modal para registrar un abono (pago parcial) a una venta. Muestra la cobranza
// (total con IVA, abonado, saldo), captura el monto/medio/fecha/referencia y, al
// guardar, la venta se recalcula (y se autocompleta si el abono salda el total).
export default function PaymentModal({ isOpen, onClose, sale, onPaid }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("EFE");
  const [paymentDate, setPaymentDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = sale ? Number(sale.balance_usd) : 0;

  useEffect(() => {
    if (!isOpen || !sale) return;
    setError(null);
    setAmount("");
    setMethod("EFE");
    setReference("");
    setNotes("");
    setPaymentDate(todayISO());
  }, [isOpen, sale]);

  if (!sale) return null;

  const amountNum = Number(amount);
  const remaining = Math.max(0, balance - (Number.isFinite(amountNum) ? amountNum : 0));

  const handleSave = async () => {
    setError(null);
    if (amount.trim() === "" || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido mayor que cero.");
      return;
    }
    if (amountNum > balance + 0.005) {
      setError(`El abono supera el saldo pendiente (${fmtUSD(balance)}).`);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await salesService.addPayment(sale.id, {
        amount_usd: amountNum,
        method,
        payment_date: paymentDate || null,
        reference: reference.trim(),
        notes: notes.trim(),
      });
      onPaid(updated);
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar el abono."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg">
      <div className="p-6 sm:p-8">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Registrar abono · Venta #{sale.id}
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{sale.customer_name}</p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo registrar el abono" message={error} />
          </div>
        )}

        {/* Estado de cobranza (referencia) */}
        <div className="mb-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total con IVA</span>
            <span className="text-gray-800 dark:text-white/90">{fmtUSD(sale.total_with_iva_usd)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Abonado</span>
            <span className="text-gray-800 dark:text-white/90">{fmtUSD(sale.amount_paid_usd)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm font-semibold dark:border-gray-800">
            <span className="text-gray-700 dark:text-gray-300">Saldo pendiente</span>
            <span className="text-gray-900 dark:text-white">{fmtUSD(balance)}</span>
          </div>
          {amount.trim() !== "" && !Number.isNaN(amountNum) && amountNum > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Saldo tras este abono</span>
              <span>{remaining <= 0.005 ? "Pagada (se completará)" : fmtUSD(remaining)}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Monto del abono (USD)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <Button variant="outline" size="sm" onClick={() => setAmount(String(balance))}>
                  Saldo total
                </Button>
              </div>
            </div>
            <div>
              <Label>Medio de pago</Label>
              <Select options={PAYMENT_METHODS} defaultValue={method} onChange={setMethod} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Fecha del abono</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>Referencia (opcional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° de transferencia…"
              />
            </div>
          </div>
          <div>
            <Label>Nota (opcional)</Label>
            <TextArea rows={2} value={notes} onChange={setNotes} placeholder="Observaciones del pago" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Guardando…" : "Registrar abono"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
