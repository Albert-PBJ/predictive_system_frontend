import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import { BoxIconLine, ListIcon, DollarLineIcon, BoxCubeIcon } from "../../icons";
import StatCard from "../../components/stats/StatCard";
import ChartCard from "../../components/stats/ChartCard";
import DonutChart from "../../components/stats/DonutChart";
import BarChart from "../../components/stats/BarChart";
import RankTable, { type RankColumn } from "../../components/stats/RankTable";
import {
  statsService,
  type ProductRankRow,
  type SlowMover,
} from "../../services/statsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fmtUSD, fmtInt } from "../../utils/format";

const STOCK_COLORS = ["#12b76a", "#f79009", "#f04438"]; // ok / bajo / sin stock

const topUnitsCols: RankColumn<ProductRankRow>[] = [
  { key: "name", label: "Producto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "category", label: "Categoría" },
  { key: "units", label: "Unidades", align: "right", render: (r) => <span className="font-semibold text-gray-800 dark:text-white/90">{fmtInt(r.units)}</span> },
  { key: "revenue", label: "Ingresos", align: "right", render: (r) => fmtUSD(r.revenue) },
];

const topRevenueCols: RankColumn<ProductRankRow>[] = [
  { key: "name", label: "Producto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "category", label: "Categoría" },
  { key: "revenue", label: "Ingresos", align: "right", render: (r) => <span className="font-semibold text-gray-800 dark:text-white/90">{fmtUSD(r.revenue)}</span> },
  { key: "units", label: "Unidades", align: "right", render: (r) => fmtInt(r.units) },
];

const slowCols: RankColumn<SlowMover>[] = [
  { key: "name", label: "Producto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "sku", label: "SKU", render: (r) => r.sku || "—" },
  { key: "category", label: "Categoría" },
  { key: "stock", label: "Stock", align: "right", render: (r) => fmtInt(r.stock) },
];

export default function ProductsStats() {
  const { data, loading, error } = useAsyncData(() => statsService.products());

  return (
    <>
      <PageMeta title="Estadísticas de productos" description="Catálogo, inventario y rotación de productos" />
      <PageBreadcrumb pageTitle="Productos" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Composición del catálogo, estado del inventario y qué productos mueven el negocio — para
        decidir qué reponer, qué impulsar y qué productos están estancados.
      </p>

      {error && <Alert variant="error" title="Error" message={error} />}

      {loading ? (
        <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando…
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Productos activos" value={fmtInt(data.totals.active)} icon={<ListIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`${fmtInt(data.totals.inactive)} inactivos`} />
            <StatCard label="Unidades en stock" value={fmtInt(data.totals.units_in_stock)} icon={<BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />} />
            <StatCard label="Valor inventario (venta)" value={fmtUSD(data.totals.inventory_retail_usd)} icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`Costo: ${fmtUSD(data.totals.inventory_cost_usd)}`} />
            <StatCard label="Sin ventas" value={fmtInt(data.totals.no_sales_count)} icon={<BoxCubeIcon className="size-6 text-gray-800 dark:text-white/90" />} hint="productos sin rotación" />
          </div>

          {/* Distribuciones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Productos por categoría" subtitle="Catálogo activo">
              <BarChart
                categories={data.by_category.map((c) => c.category)}
                series={[{ name: "Productos", data: data.by_category.map((c) => c.count) }]}
                horizontal
                distributed
                valueFormatter={fmtInt}
                height={Math.max(data.by_category.length * 38, 240)}
              />
            </ChartCard>
            <ChartCard title="Estado del inventario" subtitle="Productos activos por nivel de stock">
              <DonutChart
                labels={data.stock_status.map((s) => s.label)}
                series={data.stock_status.map((s) => s.count)}
                colors={STOCK_COLORS}
                valueFormatter={fmtInt}
                totalLabel="Productos"
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Productos por material" subtitle="Composición del catálogo">
              <DonutChart
                labels={data.by_material.map((m) => m.label)}
                series={data.by_material.map((m) => m.count)}
                valueFormatter={fmtInt}
                totalLabel="Productos"
              />
            </ChartCard>
            <ChartCard title="Activos vs. inactivos" subtitle="Catálogo total">
              <DonutChart
                labels={data.active_split.map((s) => s.label)}
                series={data.active_split.map((s) => s.count)}
                colors={["#465fff", "#d0d5dd"]}
                valueFormatter={fmtInt}
                totalLabel="Productos"
              />
            </ChartCard>
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Más vendidos" subtitle="Por unidades vendidas">
              <RankTable ranked columns={topUnitsCols} rows={data.top_by_units} />
            </ChartCard>
            <ChartCard title="Mayores ingresos" subtitle="Por facturación generada">
              <RankTable ranked columns={topRevenueCols} rows={data.top_by_revenue} />
            </ChartCard>
          </div>

          <ChartCard title="Productos sin rotación" subtitle="Activos sin ventas registradas (mayor stock primero)">
            <RankTable columns={slowCols} rows={data.slow_movers} empty="Todos los productos activos tienen ventas." />
          </ChartCard>
        </div>
      )}
    </>
  );
}
