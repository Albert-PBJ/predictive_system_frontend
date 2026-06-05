import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import ProductPicker from "../sales/ProductPicker";
import {
  inventoryService,
  MANUAL_MOVEMENT_TYPES,
  type NewMovement,
} from "../../services/inventoryService";
import type { Product } from "../../services/productsService";
import { getApiError } from "../../services/apiError";
import { todayISO } from "../../utils/format";

// Forma mínima de producto que necesita el modal (sirve para StockRow y Product).
export interface PickedProduct {
  id: number;
  name: string;
  sku: string | null;
  stock: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: PickedProduct | null; // si viene fijo, no se muestra el buscador
  onSaved: () => void;
}

export default function MovementModal({ isOpen, onClose, product, onSaved }: Props) {
  const [picked, setPicked] = useState<PickedProduct | null>(product);
  const [type, setType] = useState("ENT");
  const [direction, setDirection] = useState<"inc" | "dec">("dec"); // solo para AJU
  const [quantity, setQuantity] = useState("1");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinicia el formulario cada vez que se abre (con o sin producto fijo).
  useEffect(() => {
    if (isOpen) {
      setPicked(product);
      setType("ENT");
      setDirection("dec");
      setQuantity("1");
      setReference("");
      setNotes("");
      setDate(todayISO());
      setError(null);
    }
  }, [isOpen, product]);

  const isAdjustment = type === "AJU";

  const handleSave = async () => {
    setError(null);
    if (!picked) {
      setError("Selecciona un producto.");
      return;
    }
    const abs = Math.floor(Number(quantity) || 0);
    if (abs < 1) {
      setError("La cantidad debe ser un entero positivo.");
      return;
    }
    // Signo del delta: ENT/DEV suman; AJU según la dirección elegida.
    const signed = isAdjustment && direction === "dec" ? -abs : abs;
    if (signed < 0 && picked.stock + signed < 0) {
      setError(`El ajuste dejaría el stock en negativo (disponible: ${picked.stock}).`);
      return;
    }

    const payload: NewMovement = {
      product: picked.id,
      movement_type: type,
      quantity: signed,
      reference: reference.trim(),
      notes: notes.trim(),
      movement_date: date,
    };
    setSubmitting(true);
    try {
      await inventoryService.createMovement(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar el movimiento."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg">
      <div className="p-6 sm:p-8">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Registrar movimiento de inventario
        </h3>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo registrar" message={error} />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Producto</Label>
            {product ? (
              <div className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700">
                <span className="font-medium text-gray-800 dark:text-white/90">{picked?.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {picked?.sku ?? "—"} · Stock actual: {picked?.stock}
                </span>
              </div>
            ) : picked ? (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700">
                <span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{picked.name}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {picked.sku ?? "—"} · Stock: {picked.stock}
                  </span>
                </span>
                <Button variant="outline" size="sm" onClick={() => setPicked(null)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <ProductPicker
                onSelect={(p: Product) =>
                  setPicked({ id: p.id, name: p.name, sku: p.sku, stock: p.stock })
                }
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Tipo de movimiento</Label>
              <Select options={MANUAL_MOVEMENT_TYPES} defaultValue={type} onChange={setType} />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {isAdjustment && (
            <div>
              <Label>Dirección del ajuste</Label>
              <Select
                options={[
                  { value: "dec", label: "Disminuir (merma, pérdida)" },
                  { value: "inc", label: "Aumentar (conteo a favor)" },
                ]}
                defaultValue={direction}
                onChange={(v) => setDirection(v as "inc" | "dec")}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Referencia</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° factura, orden…"
              />
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
            {submitting ? "Registrando…" : "Registrar movimiento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
