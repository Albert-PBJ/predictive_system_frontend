import { useEffect, useRef, useState } from "react";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import Spinner from "../common/Spinner";
import CustomerFormModal from "../customers/CustomerFormModal";
import { customersService, type Customer } from "../../services/customersService";

interface Props {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  disabled?: boolean;
}

export default function CustomerPicker({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce de la búsqueda.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 350);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (value) return; // con un cliente seleccionado no buscamos
    let active = true;
    setLoading(true);
    customersService
      .list({ search: debounced.trim() || undefined, page_size: 8 })
      .then((res) => active && setResults(res.results))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, value]);

  // Cierra el desplegable al hacer clic fuera.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const select = (c: Customer) => {
    onChange(c);
    setOpen(false);
    setQuery("");
  };

  // ── Cliente ya seleccionado ──
  if (value) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-gray-800 dark:text-white/90">{value.company_name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {value.rif} · {value.customer_type_display}
            </p>
            {(value.state || value.municipality) && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {[value.municipality, value.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          {!disabled && (
            <Button variant="outline" size="sm" onClick={() => onChange(null)}>
              Cambiar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Buscador ──
  // El botón de alta va al lado del campo (no debajo): el desplegable se abre
  // justo bajo el input y taparía el botón, impidiendo el clic.
  return (
    <div ref={boxRef} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="relative flex-1" onFocus={() => setOpen(true)}>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="Buscar cliente por nombre o RIF…"
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
                No se encontraron clientes.
              </p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c)}
                  className="block w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                    {c.company_name}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {c.rif} · {c.customer_type_display}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setOpen(false);
          setShowNew(true);
        }}
        disabled={disabled}
        className="whitespace-nowrap"
      >
        + Registrar nuevo cliente
      </Button>

      {/* Alta de cliente en modal: al guardarlo queda seleccionado en la venta/presupuesto. */}
      <CustomerFormModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        customer={null}
        onSaved={(created) => {
          setShowNew(false);
          select(created);
        }}
      />
    </div>
  );
}
