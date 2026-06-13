import { useCallback, useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { PlusIcon } from "../../icons";
import CustomerFormModal from "../../components/customers/CustomerFormModal";
import {
  customersService,
  CUSTOMER_TYPES,
  type Customer,
  type CustomerInput,
} from "../../services/customersService";
import { getApiError } from "../../services/apiError";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "true", label: "Clientes activos" },
  { value: "false", label: "Prospectos / inactivos" },
];

// Construye la carga útil completa (PUT) a partir de un cliente existente, para los
// cambios rápidos (p. ej. activar/desactivar) sin abrir el formulario.
function toInput(c: Customer): CustomerInput {
  return {
    rif: c.rif,
    company_name: c.company_name,
    customer_type: c.customer_type,
    sector: c.sector,
    contact_first_name: c.contact_first_name,
    contact_last_name: c.contact_last_name,
    contact_ci: c.contact_ci,
    phone: c.phone,
    mobile: c.mobile,
    email: c.email,
    state: c.state,
    municipality: c.municipality,
    parish: c.parish,
    fiscal_address: c.fiscal_address,
    total_employees: c.total_employees,
    is_active_customer: c.is_active_customer,
  };
}

export default function CustomersManage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, activeFilter]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    customersService
      .list({
        search: debouncedSearch.trim() || undefined,
        customer_type: typeFilter || undefined,
        is_active_customer: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        if (!active) return;
        setCustomers(res.results);
        setCount(res.count);
      })
      .catch((err) => active && setError(getApiError(err, "No se pudieron cargar los clientes.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, typeFilter, activeFilter]);

  useEffect(() => load(), [load, reloadToken]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setModalOpen(true);
  };

  const toggleActive = async (c: Customer) => {
    setTogglingId(c.id);
    setError(null);
    try {
      await customersService.update(c.id, { ...toInput(c), is_active_customer: !c.is_active_customer });
      setReloadToken((t) => t + 1);
    } catch (err) {
      setError(getApiError(err, "No se pudo actualizar el cliente."));
    } finally {
      setTogglingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("");
    setActiveFilter("");
    setFiltersKey((k) => k + 1);
  };
  const hasFilters = !!search || !!typeFilter || !!activeFilter;

  return (
    <>
      <PageMeta title="Clientes" description="Gestión de clientes: alta, edición y estado" />
      <PageBreadcrumb pageTitle="Clientes" />

      <ComponentCard title="Clientes">
        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input placeholder="Buscar por nombre, RIF o contacto…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              key={`type-${filtersKey}`}
              options={CUSTOMER_TYPES}
              placeholder="Todos"
              defaultValue={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              key={`act-${filtersKey}`}
              options={STATUS_OPTIONS}
              placeholder="Todos"
              defaultValue={activeFilter}
              onChange={setActiveFilter}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasFilters}>
            Limpiar filtros
          </Button>
          <Button size="sm" startIcon={<PlusIcon className="size-5" />} onClick={openNew}>
            Nuevo cliente
          </Button>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        {/* Tabla */}
        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["RIF", "Cliente", "Tipo", "Ubicación", "Estado", ""].map((h, i) => (
                  <TableCell key={h || `acc-${i}`} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Spinner /> Cargando clientes…
                    </div>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay clientes con esos filtros." : "Aún no hay clientes. Crea el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => {
                  const location = [c.municipality, c.state].filter(Boolean).join(", ");
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.rif}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{c.company_name}</span>
                        {c.contact_full_name && (
                          <span className="block text-xs text-gray-400">{c.contact_full_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.customer_type_display}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{location || "—"}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="light" color={c.is_active_customer ? "success" : "light"} size="sm">
                          {c.is_active_customer ? "Activo" : "Prospecto"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => openEdit(c)} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActive(c)}
                            disabled={togglingId === c.id}
                            className={`text-sm font-medium disabled:opacity-50 ${
                              c.is_active_customer ? "text-error-500 hover:text-error-600" : "text-success-600 hover:text-success-700"
                            }`}
                          >
                            {togglingId === c.id ? "…" : c.is_active_customer ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {count > 0 ? `Página ${page} de ${numPages} · ${count} cliente(s)` : "Sin clientes"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={loading || page >= numPages}>
              Siguiente
            </Button>
          </div>
        </div>
      </ComponentCard>

      <CustomerFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editing}
        onSaved={() => setReloadToken((t) => t + 1)}
      />
    </>
  );
}
