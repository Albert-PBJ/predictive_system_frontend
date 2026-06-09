import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import { GroupIcon, UserCircleIcon, DollarLineIcon, CheckCircleIcon } from "../../icons";
import StatCard from "../../components/stats/StatCard";
import ChartCard from "../../components/stats/ChartCard";
import DonutChart from "../../components/stats/DonutChart";
import CustomerLocationCard from "../../components/stats/CustomerLocationCard";
import RankTable, { type RankColumn } from "../../components/stats/RankTable";
import { statsService, type CustomerRankRow } from "../../services/statsService";
import { useAsyncData } from "../../hooks/useAsyncData";
import { fmtUSD, fmtInt, fmtDate } from "../../utils/format";

const baseCols: RankColumn<CustomerRankRow>[] = [
  { key: "name", label: "Cliente", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "type", label: "Tipo" },
  { key: "state", label: "Estado" },
  { key: "orders", label: "Compras", align: "right", render: (r) => fmtInt(r.orders) },
  { key: "revenue", label: "Ingresos", align: "right", render: (r) => <span className="font-semibold text-gray-800 dark:text-white/90">{fmtUSD(r.revenue)}</span> },
];

const riskCols: RankColumn<CustomerRankRow>[] = [
  { key: "name", label: "Cliente", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.name}</span> },
  { key: "state", label: "Estado" },
  { key: "last_purchase", label: "Última compra", render: (r) => fmtDate(r.last_purchase) },
  { key: "revenue", label: "Histórico", align: "right", render: (r) => fmtUSD(r.revenue) },
];

export default function CustomersStats() {
  const { data, loading, error } = useAsyncData(() => statsService.customers());

  return (
    <>
      <PageMeta title="Estadísticas de clientes" description="Distribución y comportamiento de los clientes" />
      <PageBreadcrumb pageTitle="Clientes" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Composición de la cartera de clientes, su ubicación y los de mayor (y menor) actividad —
        para entender de dónde vienen los ingresos y qué clientes se están enfriando.
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
            <StatCard label="Clientes totales" value={fmtInt(data.totals.total)} icon={<GroupIcon className="size-6 text-gray-800 dark:text-white/90" />} />
            <StatCard label="Clientes activos" value={fmtInt(data.totals.active)} icon={<CheckCircleIcon className="size-6 text-gray-800 dark:text-white/90" />} />
            <StatCard label="Prospectos" value={fmtInt(data.totals.prospects)} icon={<UserCircleIcon className="size-6 text-gray-800 dark:text-white/90" />} />
            <StatCard label="Con compras registradas" value={fmtInt(data.totals.with_purchases)} icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />} />
          </div>

          {/* Distribuciones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Clientes por tipo" subtitle="Institucional, empresarial y particular">
              <DonutChart
                labels={data.by_type.map((t) => t.label)}
                series={data.by_type.map((t) => t.count)}
                valueFormatter={fmtInt}
                totalLabel="Clientes"
              />
            </ChartCard>
            <ChartCard title="Activos vs. prospectos" subtitle="Clientes que ya compran vs. potenciales">
              <DonutChart
                labels={data.active_split.map((s) => s.label)}
                series={data.active_split.map((s) => s.count)}
                colors={["#465fff", "#d0d5dd"]}
                valueFormatter={fmtInt}
                totalLabel="Clientes"
              />
            </ChartCard>
            <CustomerLocationCard data={data.by_state} subtitle="Top estados por nº de clientes" max={10} />
          </div>

          {/* Rankings */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Mejores clientes" subtitle="Por ingresos generados">
              <RankTable ranked columns={baseCols} rows={data.top_by_revenue} />
            </ChartCard>
            <ChartCard title="Clientes más activos" subtitle="Por número de compras">
              <RankTable ranked columns={baseCols} rows={data.top_by_orders} />
            </ChartCard>
          </div>

          <ChartCard
            title="Clientes en riesgo"
            subtitle="Activos sin comprar en los últimos 6 meses"
            action={<Badge color="warning" variant="light">{data.at_risk.length} en riesgo</Badge>}
          >
            <RankTable
              columns={riskCols}
              rows={data.at_risk}
              empty="Ningún cliente activo lleva más de 6 meses sin comprar."
            />
          </ChartCard>
        </div>
      )}
    </>
  );
}
