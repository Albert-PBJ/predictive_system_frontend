import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { api } from "../../services/api";
import type { ScraperSource } from "../../context/ScraperContext";

// Las rutas de scrapers viven en /scrapers/ (no bajo /api/). Derivamos la raíz del
// backend desde la base de la API, igual que en ScraperContext.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";
const SCRAPERS_ROOT = API_BASE.replace(/\/api\/?$/, "");

const PAGE_SIZE = 10;

interface MarketDataRow {
  id: number;
  competitor_name: string | null;
  product_name: string | null;
  category: string | null;
  price: string | null;
  currency: string | null;
  promotions: string | null;
  state: string | null;
  municipality: string | null;
  url: string | null;
  scraped_at: string | null;
}

interface DataResponse {
  count: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: MarketDataRow[];
  available_states: string[];
  available_municipalities: string[];
}

// Muestra "—" para valores vacíos, nulos o solo espacios.
function dash(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-VE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function errorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const maybe = err as { response?: { data?: { error?: string } } };
    if (maybe.response?.data?.error) return maybe.response.data.error;
  }
  return "No se pudieron cargar los datos recolectados.";
}

const COLUMNS = [
  "Producto",
  "Competidor",
  "Categoría",
  "Precio",
  "Estado",
  "Municipio",
  "Promoción",
  "Fecha",
];

export default function CollectedDataTable({
  source,
  reloadToken = 0,
}: {
  source: ScraperSource;
  reloadToken?: number;
}) {
  // Filtros
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  // Clave para forzar el remount de los <Select> al limpiar (son no controlados).
  const [filtersKey, setFiltersKey] = useState(0);

  const [page, setPage] = useState(1);

  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce de la búsqueda para no disparar una petición por tecla.
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  // Al cambiar cualquier filtro, vuelve a la primera página.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, minPrice, maxPrice, stateFilter, municipalityFilter, source]);

  // Carga de datos. Se reejecuta ante cambios de filtros, página, fuente o reloadToken.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (minPrice.trim()) params.min_price = minPrice.trim();
    if (maxPrice.trim()) params.max_price = maxPrice.trim();
    if (stateFilter) params.state = stateFilter;
    if (municipalityFilter) params.municipality = municipalityFilter;

    api
      .get<DataResponse>(`${SCRAPERS_ROOT}/scrapers/${source}/data`, { params })
      .then(({ data }) => {
        if (active) setData(data);
      })
      .catch((err) => {
        if (active) {
          setError(errorMessage(err));
          setData(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [source, page, debouncedSearch, minPrice, maxPrice, stateFilter, municipalityFilter, reloadToken]);

  const stateOptions = useMemo(
    () => (data?.available_states ?? []).map((s) => ({ value: s, label: s })),
    [data?.available_states],
  );
  const municipalityOptions = useMemo(
    () => (data?.available_municipalities ?? []).map((m) => ({ value: m, label: m })),
    [data?.available_municipalities],
  );

  const hasFilters =
    !!search || !!minPrice || !!maxPrice || !!stateFilter || !!municipalityFilter;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setMinPrice("");
    setMaxPrice("");
    setStateFilter("");
    setMunicipalityFilter("");
    setFiltersKey((k) => k + 1); // remonta los <Select> para que muestren el placeholder
  };

  const count = data?.count ?? 0;
  const numPages = data?.num_pages ?? 1;
  const rows = data?.results ?? [];

  return (
    <ComponentCard title="Datos recolectados">
      {/* ── Filtros ── */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="search">Búsqueda</Label>
          <Input
            type="text"
            placeholder="Buscar por producto, competidor, categoría o promoción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="minPrice">Precio mín.</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maxPrice">Precio máx.</Label>
            <Input
              type="number"
              min="0"
              placeholder="Sin límite"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="state">Estado</Label>
            <Select
              key={`state-${filtersKey}`}
              options={stateOptions}
              placeholder="Todos"
              defaultValue={stateFilter}
              onChange={setStateFilter}
            />
          </div>
          <div>
            <Label htmlFor="municipality">Municipio</Label>
            <Select
              key={`municipality-${filtersKey}`}
              options={municipalityOptions}
              placeholder="Todos"
              defaultValue={municipalityFilter}
              onChange={setMunicipalityFilter}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpiar filtros
            </Button>
          </div>
        </div>
      </div>

      {/* ── Estados de error/carga/vacío ── */}
      {error && (
        <div className="mt-4">
          <Alert variant="error" title="Error al cargar" message={error} />
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="mt-4 max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {COLUMNS.map((h) => (
                <TableCell
                  key={h}
                  isHeader
                  className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
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
                    <Spinner />
                    Cargando datos…
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {hasFilters
                    ? "No se encontraron datos con los filtros aplicados."
                    : "Aún no hay datos recolectados para esta plataforma."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-500 hover:underline"
                      >
                        {dash(r.product_name)}
                      </a>
                    ) : (
                      dash(r.product_name)
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {dash(r.competitor_name)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {dash(r.category)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {r.price ? `${r.price} ${r.currency ?? ""}`.trim() : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {dash(r.state)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {dash(r.municipality)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {dash(r.promotions)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(r.scraped_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Paginación ── */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {count > 0
            ? `Página ${data?.page ?? page} de ${numPages} · ${count} registro(s)`
            : "Sin registros"}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={loading || page >= numPages}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
}
