import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import { inventoryService, type Movement } from "../../services/inventoryService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtDate } from "../../utils/format";

/**
 * Lo mínimo que el modal necesita de una entrada para poder costearla. Se declara
 * aparte del `Movement` completo para que también sirva a las filas más ligeras que
 * devuelve el panel de inicio (`pending_costs`), sin obligarlas a traer todo.
 */
export interface CostableMovement {
  id: number;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  movement_date: string;
  responsible_name: string | null;
  reference: string;
  notes: string;
  unit_cost_usd: string | null;
  // Factura ya adjunta, si la hay (las filas del panel nunca la traen: están sin costear).
  cost_invoice_url?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  movement: CostableMovement | null;
  onSaved: (updated: Movement, averageBefore: string | null, averageAfter: string | null) => void;
}

/**
 * Carga del costo de compra sobre una entrada de inventario **ya registrada**.
 *
 * En la operación diaria la mercancía llega al almacén antes que la factura del
 * proveedor: almacén registra la entrada (cantidad) y días después la gerencia carga el
 * costo unitario. Al guardarlo, el backend recalcula el costo promedio ponderado del
 * producto desde el historial de movimientos.
 */
export default function CostModal({ isOpen, onClose, movement, onSaved }: Props) {
  const [unitCost, setUnitCost] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && movement) {
      // Si ya tenía costo (corrección), se precarga para editarlo.
      setUnitCost(movement.unit_cost_usd ?? "");
      setReference(movement.reference ?? "");
      setNotes(movement.notes ?? "");
      setFile(null); // el adjunto ya guardado se conserva si no se sube otro
      setError(null);
    }
  }, [isOpen, movement]);

  if (!movement) return null;

  const qty = movement.quantity;
  const cost = Number(unitCost) || 0;
  const total = cost * qty;

  const handleSave = async () => {
    setError(null);
    if (!(cost > 0)) {
      setError("Indica el costo unitario de compra (mayor que cero).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await inventoryService.setMovementCost(movement.id, {
        unit_cost: cost.toFixed(2),
        reference: reference.trim(),
        notes: notes.trim(),
        invoice_file: file,
      });
      onSaved(res.movement, res.average_cost_before, res.average_cost_after);
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo cargar el costo."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[560px] p-6 lg:p-8">
      <h4 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
        Cargar costo de compra
      </h4>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Registra el costo de la factura del proveedor sobre una entrada ya recibida. Al
        guardarlo se recalcula el costo promedio del producto.
      </p>

      {/* Resumen de la entrada que se está costeando */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm font-medium text-gray-800 dark:text-white/90">
          {movement.product_name}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {movement.product_sku ?? "Sin SKU"} · Entrada de {qty} unidad(es) ·{" "}
          {fmtDate(movement.movement_date)}
          {movement.responsible_name ? ` · registrada por ${movement.responsible_name}` : ""}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="No se pudo guardar" message={error} />
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="unitCost">Costo unitario de compra (USD)</Label>
            <Input
              id="unitCost"
              type="number"
              min="0"
              step={0.01}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label htmlFor="reference">Nº de factura del proveedor</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. FAC-00123"
            />
          </div>
        </div>

        {cost > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total de la compra:{" "}
            <span className="font-semibold text-gray-800 dark:text-white/90">
              {fmtUSD(total)}
            </span>{" "}
            ({qty} × {fmtUSD(cost)})
          </p>
        )}

        <div>
          <Label htmlFor="invoiceFile">Factura escaneada (PDF o imagen)</Label>
          <input
            id="invoiceFile"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:text-gray-700 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-300"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Opcional, hasta 10 MB. Es el respaldo del costo que se está cargando.
            {movement.cost_invoice_url && (
              <>
                {" "}Ya hay una{" "}
                <a
                  href={movement.cost_invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-500 hover:text-brand-600"
                >
                  factura adjunta
                </a>
                ; si no subes otra, se conserva.
              </>
            )}
          </p>
        </div>

        <div>
          <Label htmlFor="costNotes">Notas</Label>
          <TextArea value={notes} onChange={setNotes} rows={2} placeholder="Opcional" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Guardando…" : "Guardar costo"}
        </Button>
      </div>
    </Modal>
  );
}
