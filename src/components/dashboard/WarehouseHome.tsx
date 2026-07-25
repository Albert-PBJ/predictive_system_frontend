import { useEffect, useState } from "react";
import { Link } from "react-router";
import ChartCard from "../stats/ChartCard";
import BarChart from "../stats/BarChart";
import RankTable from "../stats/RankTable";
import StatCard from "../stats/StatCard";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import DateRangeFilter from "./DateRangeFilter";
import NarrativeBanner from "./NarrativeBanner";
import { useAuth } from "../../context/AuthContext";
import { inventoryService } from "../../services/inventoryService";
import type {
  DateRange,
  NoDemandRow,
  RestockRow,
  WarehouseDashboard,
  WarehouseMovementRow,
} from "../../services/statsService";
import { fmtInt, fmtUSD, fmtDate } from "../../utils/format";

interface Props {
  data: WarehouseDashboard;
  loading: boolean;
  from: string;
  to: string;
  onRange: (range: Partial<DateRange>) => void;
}

const movTypeColor = (t: string): "success" | "error" | "warning" | "info" => {
  if (t === "ENT" || t === "DEV") return "success";
  if (t === "SAL") return "error";
  return "warning"; // AJU
};

/** Panel de Inicio del encargado de inventario (rol WAREHOUSE): solo stock y
 *  productos. Sin ventas, clientes ni ingresos — no son relevantes para su rol. */
export default function WarehouseHome({ data, loading, from, to, onRange }: Props) {
  const inv = data.inventory_health;
  const { hasRole } = useAuth();
  // Verificar un movimiento (confirmar que el cambio físico ocurrió) es solo para el
  // encargado de inventario y el admin (mismo criterio que el backend `IsStockVerifier`).
  const canVerify = hasRole("ADMIN", "WAREHOUSE");

  // Copia local de los movimientos para reflejar la verificación al instante sin
  // recargar todo el panel; se resincroniza cuando el panel trae datos nuevos.
  const [movs, setMovs] = useState<WarehouseMovementRow[]>(data.recent_movements);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  useEffect(() => setMovs(data.recent_movements), [data.recent_movements]);

  const toggleVerify = async (id: number, next: boolean) => {
    setVerifyingId(id);
    try {
      const updated = await inventoryService.verifyMovement(id, next);
      setMovs((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                verified: updated.verified,
                verified_by_name: updated.verified_by_name,
                verified_at: updated.verified_at,
              }
            : m,
        ),
      );
    } catch {
      /* si falla, se deja el estado como estaba (best-effort) */
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Máquina del tiempo: el rango solo afecta a la rotación (productos sin salidas). */}
      <DateRangeFilter
        from={from}
        to={to}
        min={data.range.data_from}
        max={data.range.data_to}
        onChange={onRange}
        loading={loading}
      />

      <div className={loading ? "pointer-events-none opacity-60 transition" : "transition"}>
        <div className="space-y-4 md:space-y-6">
          <NarrativeBanner
            sentences={data.narrative}
            rangeLabel={`${data.range.from_label} – ${data.range.to_label}`}
          />

          {/* Estado del inventario (instantánea actual) */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Productos activos" value={fmtInt(inv.active_products)} />
            <StatCard label="Unidades en stock" value={fmtInt(inv.units_in_stock)} />
            <StatCard label="Stock suficiente" value={fmtInt(inv.ok_stock)} hint="por encima del mínimo" />
            <StatCard label="Stock bajo" value={fmtInt(inv.low_stock)} hint="en o bajo el mínimo" />
            <StatCard label="Sin stock" value={fmtInt(inv.out_of_stock)} hint="agotados" />
          </div>

          {/* Últimos movimientos de inventario + verificación de almacén */}
          <ChartCard
            title="Últimos movimientos de inventario"
            subtitle="Verifica que cada cambio de existencias ocurrió físicamente"
            action={
              <Link to="/inventario" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                Ver todos
              </Link>
            }
          >
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Fecha", "Producto", "Tipo", "Cantidad", "Responsable", "Verificación"].map((h) => (
                      <TableCell key={h} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {movs.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        Aún no hay movimientos de inventario.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movs.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(m.movement_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                          {m.product_name}
                          <span className="block text-xs text-gray-400">{m.product_sku ?? "—"}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="light" color={movTypeColor(m.movement_type)} size="sm">
                            {m.movement_type_display}
                          </Badge>
                        </TableCell>
                        <TableCell className={`px-4 py-3 text-sm font-semibold ${m.quantity < 0 ? "text-error-500" : "text-success-600"}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{m.responsible_name ?? "—"}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {m.verified ? (
                              <Badge variant="light" color="success" size="sm">
                                Verificado{m.verified_by_name ? ` · ${m.verified_by_name}` : ""}
                              </Badge>
                            ) : (
                              <Badge variant="light" color="warning" size="sm">
                                Pendiente
                              </Badge>
                            )}
                            {canVerify && (
                              <button
                                type="button"
                                onClick={() => toggleVerify(m.id, !m.verified)}
                                disabled={verifyingId === m.id}
                                className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
                              >
                                {verifyingId === m.id ? "…" : m.verified ? "Quitar" : "Verificar"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ChartCard>

          {/* Ventas del mes con despacho incluido y sin orden de despacho aún */}
          <ChartCard
            title="Ventas con despacho pendiente"
            subtitle={`${data.pending_dispatch_count} venta(s) del mes con despacho incluido sin orden de despacho`}
            action={
              <Link to="/ventas/despachos" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                Ir a despachos
              </Link>
            }
          >
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                  <TableRow>
                    {["Venta", "Fecha", "Cliente", "Despacho", "Total", ""].map((h) => (
                      <TableCell key={h} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.pending_dispatch.length === 0 ? (
                    <TableRow>
                      <TableCell className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No hay ventas del mes esperando su orden de despacho. 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.pending_dispatch.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">#{s.id}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtDate(s.sale_date)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{s.customer_name}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(s.delivery_cost_usd)}</TableCell>
                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(s.total_with_iva_usd)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Link
                            to={`/ventas/historial?sale=${s.id}`}
                            className="text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Generar despacho
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ChartCard>

          {/* Reabastecimiento prioritario + stock por categoría */}
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            <div className="col-span-12 xl:col-span-7">
              <ChartCard
                title="Reabastecimiento prioritario"
                subtitle={`${data.restock_count} producto(s) en o por debajo de su mínimo`}
                action={
                  <Link to="/inventario" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                    Ir a inventario
                  </Link>
                }
              >
                <RankTable<RestockRow>
                  rows={data.restock_list}
                  empty="Ningún producto necesita reabastecimiento. 🎉"
                  columns={[
                    { key: "name", label: "Producto", render: (r) => <span className="font-medium">{r.name}</span> },
                    { key: "category", label: "Categoría" },
                    { key: "stock", label: "Stock", align: "right", render: (r) => fmtInt(r.stock) },
                    { key: "min_stock", label: "Mínimo", align: "right", render: (r) => fmtInt(r.min_stock) },
                    { key: "deficit", label: "Faltante", align: "right", render: (r) => fmtInt(r.deficit) },
                    {
                      key: "status",
                      label: "Estado",
                      render: (r) => (
                        <Badge variant="light" color={r.status === "out" ? "error" : "warning"} size="sm">
                          {r.status === "out" ? "Sin stock" : "Stock bajo"}
                        </Badge>
                      ),
                    },
                  ]}
                />
              </ChartCard>
            </div>
            <div className="col-span-12 xl:col-span-5">
              <ChartCard title="Stock por categoría" subtitle="Unidades en stock por categoría (actual)">
                <BarChart
                  categories={data.stock_by_category.map((c) => c.category)}
                  series={[{ name: "Unidades", data: data.stock_by_category.map((c) => c.units) }]}
                  horizontal
                  distributed
                  valueFormatter={fmtInt}
                />
              </ChartCard>
            </div>
          </div>

          {/* Productos sin rotación */}
          <ChartCard
            title="Productos sin rotación"
            subtitle={`${data.no_demand_count} producto(s) sin salidas en el rango — capital inmovilizado`}
          >
            <RankTable<NoDemandRow>
              rows={data.no_demand}
              empty="Todos los productos tuvieron salidas en el rango. 🎉"
              columns={[
                { key: "name", label: "Producto", render: (r) => <span className="font-medium">{r.name}</span> },
                { key: "category", label: "Categoría" },
                { key: "stock", label: "Stock", align: "right", render: (r) => fmtInt(r.stock) },
                { key: "retail_value", label: "Valor detenido", align: "right", render: (r) => fmtUSD(r.retail_value) },
              ]}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
