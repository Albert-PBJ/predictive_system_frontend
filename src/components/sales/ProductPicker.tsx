import { useEffect, useRef, useState } from "react";
import Input from "../form/input/InputField";
import Spinner from "../common/Spinner";
import { productsService, isService, type Product } from "../../services/productsService";
import { fmtUSD } from "../../utils/format";

interface Props {
  onSelect: (product: Product) => void;
  // Ids ya agregados a la venta: se muestran deshabilitados para evitar duplicados.
  excludeIds?: number[];
  disabled?: boolean;
  // Permite seleccionar productos sin stock (para presupuestos: son una oferta, no
  // descuentan inventario). En ventas se deja en false para no vender sin existencias.
  allowOutOfStock?: boolean;
}

export default function ProductPicker({ onSelect, excludeIds = [], disabled = false, allowOutOfStock = false }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productsService
      .list({ search: debounced.trim() || undefined, is_active: true, page_size: 8 })
      .then((res) => active && setResults(res.results))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (p: Product) => {
    onSelect(p);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative" onFocus={() => setOpen(true)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Buscar producto por nombre o SKU…"
        disabled={disabled}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <Spinner /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron productos.
            </p>
          ) : (
            results.map((p) => {
              const added = excludeIds.includes(p.id);
              const svc = isService(p);
              // Un servicio (Mantenimiento) no tiene stock: se puede vender siempre.
              const noStock = !svc && p.stock <= 0;
              // En presupuestos se permite cotizar sin stock; solo se bloquea el duplicado.
              const blocked = added || (noStock && !allowOutOfStock);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => choose(p)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${
                    blocked
                      ? "cursor-not-allowed opacity-50"
                      : "hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {p.name}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {p.sku ?? "—"} · {p.category_name ?? "Sin categoría"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm text-gray-700 dark:text-gray-300">
                      {fmtUSD(p.sale_price_usd)}
                    </span>
                    <span
                      className={`block text-xs ${
                        noStock
                          ? "text-error-500"
                          : svc
                          ? "text-brand-500"
                          : p.low_stock
                          ? "text-warning-500"
                          : "text-gray-400"
                      }`}
                    >
                      {added
                        ? "Ya agregado"
                        : svc
                        ? "Servicio"
                        : noStock
                        ? "Sin stock"
                        : `Stock: ${p.stock}`}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
