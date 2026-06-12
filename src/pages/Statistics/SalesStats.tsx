import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import { DollarLineIcon, GroupIcon, PieChartIcon, BoxIconLine } from "../../icons";
import StatCard from "../../components/stats/StatCard";
import ChartCard from "../../components/stats/ChartCard";
import DonutChart from "../../components/stats/DonutChart";
import BarChart from "../../components/stats/BarChart";
import LineChart from "../../components/stats/LineChart";
import RankTable, { type RankColumn } from "../../components/stats/RankTable";
import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import { statsService, type SellerRankRow } from "../../services/statsService";
import { useRangedData } from "../../hooks/useRangedData";
import { fmtUSD, fmtInt, fmtPct } from "../../utils/format";

const TYPE_COLORS = ["#465fff", "#12b76a"];

const sellerCols: RankColumn<SellerRankRow>[] = [
  { key: "name", label: "Vendedor", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "count", label: "Ventas", align: "right", render: (r) => fmtInt(r.count) },
  { key: "profit", label: "Utilidad", align: "right", render: (r) => fmtUSD(r.profit) },
  { key: "revenue", label: "Ingresos", align: "right", render: (r) => <span className="font-semibold text-gray-800 dark:text-white/90">{fmtUSD(r.revenue)}</span> },
];

export default function SalesStats() {
  const { range, setRange, data, loading, error } = useRangedData((r) => statsService.sales(r));

  return (
    <>
      <PageMeta title="Estadísticas de ventas" description="Ingresos, utilidad y composición de las ventas" />
      <PageBreadcrumb pageTitle="Ventas" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Cómo evolucionan los ingresos y la utilidad, el peso del canal detal frente al institucional,
        y qué categorías y vendedores aportan más — la foto para decidir dónde enfocar el esfuerzo.
        Todo se recalcula para el rango elegido.
      </p>

      {error && <Alert variant="error" title="Error" message={error} />}

      {!data ? (
        <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando…
        </div>
      ) : (
        <div className="space-y-6">
          <DateRangeFilter
            from={range.from ?? data.range.from}
            to={range.to ?? data.range.to}
            min={data.range.data_from}
            max={data.range.data_to}
            onChange={setRange}
            loading={loading}
          />
          <div className={loading ? "pointer-events-none space-y-6 opacity-60 transition" : "space-y-6 transition"}>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Ingresos totales" value={fmtUSD(data.totals.revenue)} icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`${fmtInt(data.totals.count)} ventas`} />
            <StatCard label="Utilidad total" value={fmtUSD(data.totals.profit)} icon={<PieChartIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`Margen ${fmtPct(data.totals.margin_pct)}`} />
            <StatCard label="Ticket promedio" value={fmtUSD(data.totals.avg_ticket)} icon={<BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />} />
            <StatCard label="Descuentos otorgados" value={fmtUSD(data.totals.discount)} icon={<GroupIcon className="size-6 text-gray-800 dark:text-white/90" />} />
          </div>

          {/* Tendencia */}
          <ChartCard title="Ingresos y utilidad por mes" subtitle="Evolución mensual dentro del rango (ventas completadas)">
            <LineChart
              categories={data.monthly.map((m) => m.label)}
              series={[
                { name: "Ingresos", data: data.monthly.map((m) => m.revenue), color: "#465fff" },
                { name: "Utilidad", data: data.monthly.map((m) => m.profit ?? 0), color: "#12b76a" },
              ]}
              valueFormatter={fmtUSD}
              height={320}
            />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Detal vs. institucional" subtitle="Ingresos por tipo de venta">
              <DonutChart
                labels={data.by_type.map((t) => t.label)}
                series={data.by_type.map((t) => t.revenue)}
                colors={TYPE_COLORS}
                valueFormatter={fmtUSD}
                totalLabel="Ingresos"
              />
            </ChartCard>
            <ChartCard className="lg:col-span-2" title="Composición mensual por canal" subtitle="Ingresos detal vs. institucional (rango)">
              <BarChart
                categories={data.monthly_by_type.map((m) => m.label)}
                series={[
                  { name: "Detal", data: data.monthly_by_type.map((m) => m.retail), color: "#465fff" },
                  { name: "Institucional", data: data.monthly_by_type.map((m) => m.institutional), color: "#12b76a" },
                ]}
                stacked
                valueFormatter={fmtUSD}
                height={320}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Ingresos por categoría" subtitle="Top categorías por facturación">
              <BarChart
                categories={data.revenue_by_category.map((c) => c.category)}
                series={[{ name: "Ingresos", data: data.revenue_by_category.map((c) => c.revenue) }]}
                horizontal
                distributed
                valueFormatter={fmtUSD}
                height={Math.max(data.revenue_by_category.length * 38, 240)}
              />
            </ChartCard>
            <ChartCard title="Mejores vendedores" subtitle="Por ingresos generados">
              <RankTable ranked columns={sellerCols} rows={data.top_sellers} />
            </ChartCard>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
