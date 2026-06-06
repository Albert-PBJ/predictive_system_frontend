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
import ProductFormModal from "../../components/products/ProductFormModal";
import {
  productsService,
  type Category,
  type Product,
} from "../../services/productsService";
import { getApiError } from "../../services/apiError";
import { fmtUSD } from "../../utils/format";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

export default function ProductsCatalog() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [filtersKey, setFiltersKey] = useState(0);
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    productsService.categories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, activeFilter]);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    productsService
      .list({
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter ? Number(categoryFilter) : undefined,
        is_active: activeFilter === "" ? undefined : activeFilter === "true",
        page,
        page_size: PAGE_SIZE,
      })
      .then((res) => {
        if (!active) return;
        setProducts(res.results);
        setCount(res.count);
      })
      .catch((err) => active && setError(getApiError(err, "No se pudieron cargar los productos.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, categoryFilter, activeFilter]);

  useEffect(() => load(), [load, reloadToken]);

  const numPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setModalOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setActiveFilter("");
    setFiltersKey((k) => k + 1);
  };
  const hasFilters = !!search || !!categoryFilter || !!activeFilter;

  const stockBadge = (p: Product) => (
    <Badge variant="light" color={p.stock <= 0 ? "error" : p.low_stock ? "warning" : "success"} size="sm">
      {p.stock} {p.stock <= 0 ? "· sin stock" : p.low_stock ? "· bajo" : ""}
    </Badge>
  );

  return (
    <>
      <PageMeta title="Productos" description="Catálogo de productos: alta, edición y consulta" />
      <PageBreadcrumb pageTitle="Productos" />

      <ComponentCard title="Catálogo de productos">
        {/* Filtros + nuevo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input placeholder="Buscar por nombre o SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select
              key={`cat-${filtersKey}`}
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="Todas"
              defaultValue={categoryFilter}
              onChange={setCategoryFilter}
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
            Nuevo producto
          </Button>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="error" title="Error al cargar" message={error} />
          </div>
        )}

        {/* Tabla */}
        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["SKU", "Producto", "Categoría", "Material", "Compra", "Venta", "Stock", "Estado", ""].map((h, i) => (
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
                      <Spinner /> Cargando productos…
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    {hasFilters ? "No hay productos con esos filtros." : "Aún no hay productos. Crea el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.sku ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{p.name}</span>
                      {p.full_name && p.full_name !== p.name && (
                        <span className="block text-xs text-gray-400">{p.full_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.category_name ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.material_display ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.purchase_price_usd ? fmtUSD(p.purchase_price_usd) : "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{fmtUSD(p.sale_price_usd)}</TableCell>
                    <TableCell className="px-4 py-3">{stockBadge(p)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="light" color={p.is_active ? "success" : "light"} size="sm">
                        {p.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button type="button" onClick={() => openEdit(p)} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                        Editar
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {count > 0 ? `Página ${page} de ${numPages} · ${count} producto(s)` : "Sin productos"}
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

      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        categories={categories}
        onSaved={() => setReloadToken((t) => t + 1)}
      />
    </>
  );
}
