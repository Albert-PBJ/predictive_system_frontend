import { useEffect, useRef, useState } from "react";
import Input from "../form/input/InputField";
import Spinner from "../common/Spinner";
import { quotesService, type Quote } from "../../services/quotesService";
import { fmtUSD, fmtDate } from "../../utils/format";

interface Props {
  onSelect: (quote: Quote) => void;
  disabled?: boolean;
}

// Buscador de presupuestos **vigentes y convertibles** (no convertidos/rechazados, sin
// vencer) para relacionar con una venta al registrarla. Solo busca y selecciona; la
// carga de los datos del presupuesto en el formulario la hace el componente padre.
export default function QuotePicker({ onSelect, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Quote[]>([]);
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
    quotesService
      .list({ search: debounced.trim() || undefined, convertible: true, page_size: 8 })
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

  const select = (q: Quote) => {
    onSelect(q);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative" onFocus={() => setOpen(true)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        placeholder="Buscar presupuesto por número o cliente…"
        disabled={disabled}
      />

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <Spinner /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
              No hay presupuestos vigentes que coincidan.
            </p>
          ) : (
            results.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => select(q)}
                className="block w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {q.quote_number}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{fmtUSD(q.total_usd)}</span>
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  {q.customer_name} · {q.status_display}
                  {q.expiry_date ? ` · vence ${fmtDate(q.expiry_date)}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
