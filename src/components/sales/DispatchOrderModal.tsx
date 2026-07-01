import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import { Link } from "react-router";
import {
  dispatchService,
  DISPATCH_STATUSES,
  type DispatchOrder,
  type NewDispatchOrderItem,
} from "../../services/dispatchService";
import type { Sale } from "../../services/salesService";
import { getApiError } from "../../services/apiError";
import { downloadDispatchPdf } from "../dispatch/downloadDispatch";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onCreated?: (order: DispatchOrder) => void;
}

// Genera una orden de despacho a partir de una venta. Por defecto despacha toda la
// mercancía de la venta; opcionalmente permite editar las cantidades (despacho
// parcial). No mueve inventario. Al crearla, ofrece descargar el PDF.
export default function DispatchOrderModal({ isOpen, onClose, sale, onCreated }: Props) {
  const [dispatchDate, setDispatchDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PEN");
  const [editLines, setEditLines] = useState(false);
  const [qtys, setQtys] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<DispatchOrder | null>(null);

  useEffect(() => {
    if (!isOpen || !sale) return;
    setError(null);
    setCreated(null);
    setDispatchDate("");
    setDeliveryAddress(sale.customer_address || "");
    setCarrier("");
    setNotes("");
    setStatus("PEN");
    setEditLines(false);
    setQtys(Object.fromEntries(sale.items.map((it) => [it.product, it.quantity])));
  }, [isOpen, sale]);

  if (!sale) return null;

  const handleSave = async () => {
    setError(null);
    let items: NewDispatchOrderItem[] | undefined;
    if (editLines) {
      items = sale.items
        .map((it) => ({ product: it.product, quantity: Math.floor(qtys[it.product] ?? 0) }))
        .filter((l) => l.quantity > 0);
      if (items.length === 0) {
        setError("Indica al menos una línea con cantidad mayor que cero.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const order = await dispatchService.create({
        sale: sale.id,
        dispatch_date: dispatchDate || null,
        delivery_address: deliveryAddress.trim(),
        carrier: carrier.trim(),
        notes: notes.trim(),
        status,
        items,
      });
      setCreated(order);
      onCreated?.(order);
    } catch (err) {
      setError(getApiError(err, "No se pudo generar la orden de despacho."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg">
      <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">
        {created ? (
          <>
            <Alert
              variant="success"
              title={`Orden ${created.order_number} generada`}
              message={`Se generó la orden de despacho para la venta #${sale.id} (${sale.customer_name}).`}
            />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
              <Link to="/ventas/despachos">
                <Button variant="outline">Ir a órdenes de despacho</Button>
              </Link>
              <Button onClick={() => downloadDispatchPdf(created)}>Descargar PDF</Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
              Generar orden de despacho
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              Venta #{sale.id} · {sale.customer_name}
            </p>

            {error && (
              <div className="mb-4">
                <Alert variant="error" title="No se pudo generar" message={error} />
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>Fecha de despacho</Label>
                  <Input type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
                </div>
                <div>
                  <Label>Estado inicial</Label>
                  <Select options={DISPATCH_STATUSES} defaultValue={status} onChange={setStatus} />
                </div>
              </div>
              <div>
                <Label>Dirección de entrega</Label>
                <TextArea rows={2} value={deliveryAddress} onChange={setDeliveryAddress} placeholder="Dirección de entrega" />
              </div>
              <div>
                <Label>Transporte / responsable</Label>
                <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Transporte o responsable de la entrega" />
              </div>

              {/* Líneas a despachar */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={editLines}
                    onChange={(e) => setEditLines(e.target.checked)}
                    className="size-4 rounded border-gray-300"
                  />
                  Editar cantidades (despacho parcial)
                </label>
                <div className="mt-3 space-y-2">
                  {sale.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {it.product_name}
                        <span className="block text-xs text-gray-400">{it.product_sku ?? "—"}</span>
                      </span>
                      {editLines ? (
                        <input
                          type="number"
                          min={0}
                          value={qtys[it.product] ?? 0}
                          onChange={(e) =>
                            setQtys((prev) => ({ ...prev, [it.product]: Math.floor(Number(e.target.value) || 0) }))
                          }
                          className="h-9 w-20 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:text-white/90"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">{it.quantity} u.</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notas</Label>
                <TextArea rows={2} value={notes} onChange={setNotes} placeholder="Observaciones (opcional)" />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={submitting}>
                {submitting ? "Generando…" : "Generar orden"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
