import { useEffect, useState } from "react";
import Select from "../form/Select";
import Label from "../form/Label";
import { analyticsService, type ForecastableProduct } from "../../services/analyticsService";

// Caché a nivel de módulo: la lista de productos pronosticables se comparte entre
// páginas y no cambia durante la sesión, así no se vuelve a pedir en cada navegación.
let _cache: ForecastableProduct[] | null = null;
let _promise: Promise<ForecastableProduct[]> | null = null;

function loadProducts(): Promise<ForecastableProduct[]> {
  if (_cache) return Promise.resolve(_cache);
  if (!_promise) {
    _promise = analyticsService.forecastableProducts().then((p) => {
      _cache = p;
      return p;
    });
  }
  return _promise;
}

interface ProductSelectProps {
  value: number | null;
  onChange: (id: number, product: ForecastableProduct) => void;
  label?: string;
}

/** Selector de producto (solo los que tienen historial de ventas). Autoselecciona el más vendido. */
export default function ProductSelect({ value, onChange, label = "Producto" }: ProductSelectProps) {
  const [products, setProducts] = useState<ForecastableProduct[]>(_cache || []);

  useEffect(() => {
    let active = true;
    loadProducts().then((p) => {
      if (!active) return;
      setProducts(p);
      if (value === null && p.length) onChange(p[0].id, p[0]); // autoselección del más vendido
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = products.map((p) => ({
    value: String(p.id),
    label: `${p.name}${p.sku ? ` · ${p.sku}` : ""}`,
  }));

  return (
    <div className="w-64">
      <Label>{label}</Label>
      <Select
        key={`prod-${value}-${options.length}`}
        options={options}
        defaultValue={value ? String(value) : ""}
        placeholder="Selecciona un producto"
        onChange={(v) => {
          const prod = products.find((p) => p.id === Number(v));
          if (prod) onChange(prod.id, prod);
        }}
      />
    </div>
  );
}
