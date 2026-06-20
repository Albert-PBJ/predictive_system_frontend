import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import {
  productsService,
  MATERIAL_OPTIONS,
  type Category,
  type Product,
  type ProductInput,
} from "../../services/productsService";
import { getApiError } from "../../services/apiError";

// Estilo de los <select> nativos para igualar al componente Select del template
// (este formulario los usa controlados, por eso no reutiliza ese componente).
const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null; // null = crear
  categories: Category[];
  onSaved: () => void;
}

const EMPTY = {
  sku: "",
  name: "",
  full_name: "",
  category: "",
  material: "",
  colors: "",
  purchase_price_usd: "",
  sale_price_usd: "",
  min_stock: "0",
  is_manufactured: true,
  is_active: true,
};

type FormState = typeof EMPTY;

function fromProduct(p: Product): FormState {
  const s = (v: string | null) => v ?? "";
  return {
    sku: s(p.sku),
    name: p.name,
    full_name: s(p.full_name),
    category: p.category != null ? String(p.category) : "",
    material: s(p.material),
    colors: (p.colors ?? []).join(", "),
    purchase_price_usd: s(p.purchase_price_usd),
    sale_price_usd: p.sale_price_usd ?? "",
    min_stock: String(p.min_stock ?? 0),
    is_manufactured: p.is_manufactured,
    is_active: p.is_active,
  };
}

// "" → null; texto → texto (para decimales opcionales).
const nn = (v: string): string | null => (v.trim() ? v.trim() : null);

export default function ProductFormModal({ isOpen, onClose, product, categories, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = product !== null;

  useEffect(() => {
    if (isOpen) {
      setForm(product ? fromProduct(product) : EMPTY);
      setError(null);
    }
  }, [isOpen, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const num = (key: keyof FormState, label: string, opts: { step?: number } = {}) => (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        step={opts.step ?? 0.01}
        min="0"
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  );

  const handleSubmit = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    const price = Number(form.sale_price_usd);
    if (!form.sale_price_usd.trim() || Number.isNaN(price) || price < 0) {
      setError("El precio de venta es obligatorio y debe ser un número válido.");
      return;
    }

    const payload: ProductInput = {
      sku: form.sku.trim() || null,
      name: form.name.trim(),
      full_name: form.full_name.trim(),
      category: form.category ? Number(form.category) : null,
      material: form.material || null,
      colors: form.colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      purchase_price_usd: nn(form.purchase_price_usd),
      sale_price_usd: form.sale_price_usd.trim(),
      min_stock: Math.max(0, Math.floor(Number(form.min_stock) || 0)),
      is_manufactured: form.is_manufactured,
      is_active: form.is_active,
    };

    setSubmitting(true);
    try {
      if (isEdit) await productsService.update(product!.id, payload);
      else await productsService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo guardar el producto."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-3xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="px-6 pt-6 sm:px-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? `Editar producto · ${product!.name}` : "Nuevo producto"}
          </h3>
          {error && (
            <div className="mt-4">
              <Alert variant="error" title="No se pudo guardar" message={error} />
            </div>
          )}
        </div>

        <div className="custom-scrollbar overflow-y-auto px-6 py-5 sm:px-8">
          {/* Identificación */}
          <Section title="Identificación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="OK-6611N" />
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Silla Ejecutiva Stanford" />
              </div>
              <div className="sm:col-span-2">
                <Label>Nombre completo</Label>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nombre descriptivo largo (opcional)" />
              </div>
            </div>
          </Section>

          {/* Clasificación */}
          <Section title="Clasificación">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Categoría</Label>
                <select className={selectClass} value={form.category} onChange={(e) => set("category", e.target.value)}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Material</Label>
                <select className={selectClass} value={form.material} onChange={(e) => set("material", e.target.value)}>
                  <option value="">Sin especificar</option>
                  {MATERIAL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>Colores</Label>
                <Input value={form.colors} onChange={(e) => set("colors", e.target.value)} placeholder="Negro, Gris, Azul (separados por coma)" />
              </div>
              <div>
                <Label>Origen</Label>
                <select
                  className={selectClass}
                  value={form.is_manufactured ? "true" : "false"}
                  onChange={(e) => set("is_manufactured", e.target.value === "true")}
                >
                  <option value="true">Fabricado por Maescar</option>
                  <option value="false">Importado / Revendido</option>
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  className={selectClass}
                  value={form.is_active ? "true" : "false"}
                  onChange={(e) => set("is_active", e.target.value === "true")}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Precios e inventario */}
          <Section title="Precios e inventario (USD)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {num("purchase_price_usd", "Precio de compra")}
              <div>
                <Label>Precio de venta *</Label>
                <Input
                  type="number"
                  step={0.01}
                  min="0"
                  value={form.sale_price_usd}
                  onChange={(e) => set("sale_price_usd", e.target.value)}
                />
              </div>
              {num("min_stock", "Stock mínimo", { step: 1 })}
            </div>
            {isEdit && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Stock actual: <span className="font-semibold text-gray-700 dark:text-gray-300">{product!.stock}</span>
                {" "}· el stock no se edita aquí; ajústalo desde <span className="font-medium">Inventario</span>.
              </p>
            )}
          </Section>

        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800 sm:px-8">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h4>
      {children}
    </div>
  );
}
