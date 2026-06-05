import { useEffect, useRef, useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import Spinner from "../common/Spinner";
import {
  customersService,
  CUSTOMER_TYPES,
  type Customer,
  type NewCustomer,
} from "../../services/customersService";
import { getApiError } from "../../services/apiError";

interface Props {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  disabled?: boolean;
}

const EMPTY_NEW: NewCustomer = {
  rif: "",
  company_name: "",
  customer_type: "CORP",
  state: "",
  municipality: "",
  contact_first_name: "",
  contact_last_name: "",
  phone: "",
  email: "",
};

export default function CustomerPicker({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<NewCustomer>(EMPTY_NEW);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCreate = async () => {
    setError(null);
    if (!draft.rif.trim() || !draft.company_name.trim()) {
      setError("El RIF y la razón social son obligatorios.");
      return;
    }
    setCreating(true);
    try {
      const created = await customersService.create(draft);
      onChange(created);
      setShowNew(false);
      setDraft(EMPTY_NEW);
    } catch (err) {
      setError(getApiError(err, "No se pudo registrar el cliente."));
    } finally {
      setCreating(false);
    }
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

  // ── Alta rápida de cliente ──
  if (showNew) {
    return (
      <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-800 dark:text-white/90">Nuevo cliente</p>
          <Button variant="outline" size="sm" onClick={() => setShowNew(false)} disabled={creating}>
            Cancelar
          </Button>
        </div>

        {error && <Alert variant="error" title="No se pudo registrar" message={error} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>RIF / Cédula *</Label>
            <Input
              value={draft.rif}
              onChange={(e) => setDraft({ ...draft, rif: e.target.value })}
              placeholder="J-12345678-9"
            />
          </div>
          <div>
            <Label>Razón social / Nombre *</Label>
            <Input
              value={draft.company_name}
              onChange={(e) => setDraft({ ...draft, company_name: e.target.value })}
              placeholder="Corporación Andina C.A."
            />
          </div>
          <div>
            <Label>Tipo de cliente</Label>
            <Select
              options={CUSTOMER_TYPES}
              defaultValue={draft.customer_type}
              onChange={(v) => setDraft({ ...draft, customer_type: v })}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              placeholder="0241-8001122"
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Input
              value={draft.state}
              onChange={(e) => setDraft({ ...draft, state: e.target.value })}
              placeholder="Carabobo"
            />
          </div>
          <div>
            <Label>Municipio</Label>
            <Input
              value={draft.municipality}
              onChange={(e) => setDraft({ ...draft, municipality: e.target.value })}
              placeholder="Valencia"
            />
          </div>
          <div>
            <Label>Contacto (nombre)</Label>
            <Input
              value={draft.contact_first_name}
              onChange={(e) => setDraft({ ...draft, contact_first_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Contacto (apellido)</Label>
            <Input
              value={draft.contact_last_name}
              onChange={(e) => setDraft({ ...draft, contact_last_name: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Correo</Label>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              placeholder="compras@empresa.com"
            />
          </div>
        </div>

        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Registrando…" : "Registrar cliente"}
        </Button>
      </div>
    );
  }

  // ── Buscador ──
  return (
    <div ref={boxRef} className="relative" onFocus={() => setOpen(true)}>
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

      <button
        type="button"
        onClick={() => {
          setShowNew(true);
          setOpen(false);
          setError(null);
        }}
        className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600"
        disabled={disabled}
      >
        + Registrar nuevo cliente
      </button>
    </div>
  );
}
