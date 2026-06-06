import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import {
  scraperDataService,
  type MarketDataEdit,
  type MarketDataRow,
} from "../../services/scraperDataService";
import type { ScraperSource } from "../../context/ScraperContext";
import { getApiError } from "../../services/apiError";

const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  source: ScraperSource;
  row: MarketDataRow | null;
  onSaved: () => void;
}

const EMPTY = {
  product_name: "",
  category: "",
  price: "",
  currency: "",
  promotions: "",
  is_in_stock: "" as "" | "true" | "false",
};

type FormState = typeof EMPTY;

function fromRow(r: MarketDataRow): FormState {
  return {
    product_name: r.product_name ?? "",
    category: r.category ?? "",
    price: r.price ?? "",
    currency: r.currency ?? "",
    promotions: r.promotions ?? "",
    is_in_stock: r.is_in_stock === null ? "" : r.is_in_stock ? "true" : "false",
  };
}

export default function MarketDataEditModal({ isOpen, onClose, source, row, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && row) {
      setForm(fromRow(row));
      setError(null);
    }
  }, [isOpen, row]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!row) return;
    setError(null);
    if (form.price.trim() && Number.isNaN(Number(form.price))) {
      setError("El precio debe ser un número válido (o vacío).");
      return;
    }
    const payload: MarketDataEdit = {
      product_name: form.product_name.trim() || null,
      category: form.category.trim() || null,
      price: form.price.trim() || null,
      currency: form.currency || null,
      promotions: form.promotions.trim() || null,
      is_in_stock: form.is_in_stock === "" ? null : form.is_in_stock === "true",
    };
    setSubmitting(true);
    try {
      await scraperDataService.updateData(source, row.id, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo guardar el registro."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-lg">
      <div className="p-6 sm:p-8">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Editar dato recolectado
        </h3>
        <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">
          Corrige los atributos del anuncio. El competidor se gestiona aparte. Si cambias el
          precio o la moneda, se recalcula el valor en USD.
        </p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo guardar" message={error} />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Producto</Label>
            <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Sillas, Escritorios…" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Precio</Label>
              <Input type="number" step={0.01} min="0" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div>
              <Label>Moneda</Label>
              <select className={selectClass} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="">—</option>
                <option value="USD">USD</option>
                <option value="VES">VES</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Disponibilidad</Label>
            <select
              className={selectClass}
              value={form.is_in_stock}
              onChange={(e) => set("is_in_stock", e.target.value as FormState["is_in_stock"])}
            >
              <option value="">Sin especificar</option>
              <option value="true">En stock</option>
              <option value="false">Agotado</option>
            </select>
          </div>
          <div>
            <Label>Promociones</Label>
            <TextArea rows={2} value={form.promotions} onChange={(v) => set("promotions", v)} placeholder="Descuentos, envío gratis…" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
