import { useCallback, useEffect, useMemo, useState } from "react";
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
import { BoxIconLine, PlusIcon } from "../../icons";
import MovementModal, { type PickedProduct } from "../../components/inventory/MovementModal";
import {
  inventoryService,
  ALL_MOVEMENT_TYPES,
  type Movement,
  type StockRow,
} from "../../services/inventoryService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtDate } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import { CAN_MANAGE_STOCK } from "../../services/types";

const MOV_PAGE_SIZE = 10;

export default function StockControl() {
  // Los vendedores solo consultan el stock; modificarlo (movimientos manuales)
  // queda para el encargado de inventario o superior.
  const { hasRole } = useAuth();
  const canManageStock = hasRole(...CAN_MANAGE_STOCK);

  // ── Tabla de stock ──
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const [stock, setStock] = useState<StockRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [loadingStock, setLoadingStock] = useState(true);
  const [stockError, setStockError] = useState<string | null>(null);

  // ── Historial de movimientos ──
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movCount, setMovCount] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movType, setMovType] = useState("");
  const [movFiltersKey, setMovFiltersKey] = useState(0);
  const [loadingMov, setLoadingMov] = useState(true);

  // ── Modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<PickedProduct | null>(null);

  // Token para recargar ambas tablas tras registrar un movimiento.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(id);
  }, [search]);

  // Carga del resumen de stock.
  useEffect(() => {
    let active = true;
    setLoadingStock(true);
    setStockError(null);
    inventoryService
      .getStock({ search: debouncedSearch.trim() || undefined, low_stock: lowOnly || undefined })
      .then((res) => {
        if (!active) return;
        setStock(res.results);
        setTotalCount(res.count);
        setLowCount(res.low_stock_count);
      })
      .catch((err) => active && setStockError(getApiError(err, "No se pudo cargar el stock.")))
      .finally(() => active && setLoadingStock(false));
    return () => {
      active = false;
    };
  }, [debouncedSearch, lowOnly, reloadToken]);

  useEffect(() => {
    setMovPage(1);
  }, [movType]);

  // Carga del historial de movimientos.
  const loadMovements = useCallback(() => {
    let active = true;
    setLoadingMov(true);
    inventoryService
      .getMovements({ page: movPage, page_size: MOV_PAGE_SIZE, movement_type: movType || undefined })
      .then((res) => {
        if (!active) return;
        setMovements(res.results);
        setMovCount(res.count);
      })
      .catch(() => active && setMovements([]))
      .finally(() => active && setLoadingMov(false));
    return () => {
      active = false;
    };
  }, [movPage, movType]);

  useEffect(() => loadMovements(), [loadMovements, reloadToken]);

  const movNumPages = Math.max(1, Math.ceil(movCount / MOV_PAGE_SIZE));

  const openModalFor = (row: StockRow | null) => {
    setModalProduct(
      row ? { id: row.id, name: row.name, sku: row.sku, stock: row.stock } : null,
    );
    setModalOpen(true);
  };

  const onSaved = () => setReloadToken((t) => t + 1);

  const typeBadgeColor = (t: string): "success" | "error" | "warning" | "info" => {
    if (t === "ENT" || t === "DEV") return "success";
    if (t === "SAL") return "error";
    return "warning"; // AJU
  };

  const movTypeOptions = useMemo(() => ALL_MOVEMENT_TYPES, []);

  return (
    <>
      <PageMeta title="Control de stock" description="Inventario y movimientos de productos" />
      <PageBreadcrumb pageTitle="Control de stock" />

      {/* Tarjetas resumen */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Productos" value={`${totalCount}`} icon={<BoxIconLine className="text-gray-700 size-6 dark:text-gray-300" />} />
        <SummaryCard
          label="En stock bajo"
          value={`${lowCount}`}
          icon={<BoxIconLine className="text-warning-500 size-6" />}
          highlight={lowCount > 0}
        />
        {canManageStock && (
          <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <Button startIcon={<PlusIcon className="size-5" />} onClick={() => openModalFor(null)}>
              Registrar movimiento
            </Button>
          </div>
        )}
      </div>

      {/* Tabla de stock */}
      <ComponentCard title="Existencias por producto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="search">Búsqueda</Label>
            <Input placeholder="Buscar por nombre o SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="size-4 rounded border-gray-300" />
              Solo stock bajo
            </label>
          </div>
        </div>

        {stockError && (
          <div className="mt-4">
            <Alert variant="error" title="Error" message={stockError} />
          </div>
        )}

        <div className="mt-4 max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["SKU", "Producto", "Categoría", "Stock", "Mínimo", "Estado", "Precio venta", ...(canManageStock ? [""] : [])].map((h, i) => (
                  <TableCell key={h || `acc-${i}`} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingStock ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <Spinner /> Cargando stock…
                    </div>
                  </TableCell>
                </TableRow>
              ) : stock.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay productos que coincidan.
                  </TableCell>
                </TableRow>
              ) : (
                stock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.sku ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">{p.name}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.category_name ?? "—"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">{p.stock}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{p.min_stock}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="light"
                        color={p.stock <= 0 ? "error" : p.low_stock ? "warning" : "success"}
                        size="sm"
                      >
                        {p.stock <= 0 ? "Sin stock" : p.low_stock ? "Stock bajo" : "Disponible"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(p.sale_price_usd)}</TableCell>
                    {canManageStock && (
                      <TableCell className="px-4 py-3">
                        <button type="button" onClick={() => openModalFor(p)} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                          Movimiento
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      {/* Historial de movimientos */}
      <div className="mt-6">
        <ComponentCard title="Historial de movimientos">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="movType">Tipo</Label>
              <Select key={`mt-${movFiltersKey}`} options={movTypeOptions} placeholder="Todos" defaultValue={movType} onChange={setMovType} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setMovType(""); setMovFiltersKey((k) => k + 1); }} disabled={!movType}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="mt-4 max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                <TableRow>
                  {["Fecha", "Producto", "Tipo", "Cantidad", "Referencia", "Responsable"].map((h) => (
                    <TableCell key={h} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingMov ? (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center">
                      <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <Spinner /> Cargando movimientos…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aún no hay movimientos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(m.movement_date)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                        {m.product_name}
                        <span className="block text-xs text-gray-400">{m.product_sku ?? "—"}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="light" color={typeBadgeColor(m.movement_type)} size="sm">
                          {m.movement_type_display}
                        </Badge>
                      </TableCell>
                      <TableCell className={`px-4 py-3 text-sm font-semibold ${m.quantity < 0 ? "text-error-500" : "text-success-600"}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.reference || "—"}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.responsible_name ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {movCount > 0 ? `Página ${movPage} de ${movNumPages} · ${movCount} movimiento(s)` : "Sin movimientos"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setMovPage((p) => Math.max(1, p - 1))} disabled={loadingMov || movPage <= 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMovPage((p) => Math.min(movNumPages, p + 1))} disabled={loadingMov || movPage >= movNumPages}>
                Siguiente
              </Button>
            </div>
          </div>
        </ComponentCard>
      </div>

      <MovementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} product={modalProduct} onSaved={onSaved} />
    </>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-5 dark:bg-white/[0.03] ${highlight ? "border-warning-300 dark:border-warning-500/40" : "border-gray-200 dark:border-gray-800"}`}>
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
        </div>
      </div>
    </div>
  );
}
