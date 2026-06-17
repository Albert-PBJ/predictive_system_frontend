import { Link } from "react-router";
import ChartCard from "../stats/ChartCard";
import BarChart from "../stats/BarChart";
import RankTable from "../stats/RankTable";
import StatCard from "../stats/StatCard";
import Badge from "../ui/badge/Badge";
import DateRangeFilter from "./DateRangeFilter";
import NarrativeBanner from "./NarrativeBanner";
import type {
  DateRange,
  NoDemandRow,
  RestockRow,
  WarehouseDashboard,
} from "../../services/statsService";
import { fmtInt, fmtUSD } from "../../utils/format";

interface Props {
  data: WarehouseDashboard;
  loading: boolean;
  from: string;
  to: string;
  onRange: (range: Partial<DateRange>) => void;
}

/** Panel de Inicio del encargado de inventario (rol WAREHOUSE): solo stock y
 *  productos. Sin ventas, clientes ni ingresos — no son relevantes para su rol. */
export default function WarehouseHome({ data, loading, from, to, onRange }: Props) {
  const inv = data.inventory_health;

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
