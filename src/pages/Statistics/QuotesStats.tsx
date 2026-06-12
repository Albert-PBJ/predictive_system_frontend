import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import { DocsIcon, CheckCircleIcon, DollarLineIcon, TaskIcon } from "../../icons";
import StatCard from "../../components/stats/StatCard";
import ChartCard from "../../components/stats/ChartCard";
import DonutChart from "../../components/stats/DonutChart";
import BarChart from "../../components/stats/BarChart";
import LineChart from "../../components/stats/LineChart";
import RankTable, { type RankColumn } from "../../components/stats/RankTable";
import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import { statsService, type QuoteRankRow } from "../../services/statsService";
import { useRangedData } from "../../hooks/useRangedData";
import { fmtUSD, fmtInt, fmtPct, fmtDate } from "../../utils/format";

const STATUS_COLORS: Record<string, string> = {
  DRA: "#98a2b3",
  SEN: "#465fff",
  APR: "#f79009",
  REJ: "#f04438",
  CON: "#12b76a",
};

const badgeColor = (status: string): "success" | "error" | "warning" | "info" | "light" =>
  status === "CON" ? "success" : status === "REJ" ? "error" : status === "APR" ? "warning" : status === "SEN" ? "info" : "light";

const quoteCols: RankColumn<QuoteRankRow>[] = [
  { key: "quote_number", label: "Presupuesto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.quote_number}</span> },
  { key: "customer", label: "Cliente" },
  { key: "issued_date", label: "Emitido", render: (r) => fmtDate(r.issued_date) },
  { key: "status", label: "Estado", render: (r) => <Badge size="sm" color={badgeColor(r.status)}>{r.status_label}</Badge> },
  { key: "total_usd", label: "Total", align: "right", render: (r) => <span className="font-semibold text-gray-800 dark:text-white/90">{fmtUSD(r.total_usd)}</span> },
];

export default function QuotesStats() {
  const { range, setRange, data, loading, error } = useRangedData((r) => statsService.quotes(r));

  return (
    <>
      <PageMeta title="Estadísticas de presupuestos" description="Conversión y pipeline de presupuestos" />
      <PageBreadcrumb pageTitle="Presupuestos" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Cómo se cierran los presupuestos: la tasa de conversión, qué hay en el pipeline abierto y la
        evolución de emitidos vs. convertidos — para anticipar ingresos y mejorar el cierre. Se mide
        sobre los presupuestos emitidos dentro del rango elegido.
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
            <StatCard label="Presupuestos totales" value={fmtInt(data.totals.total)} icon={<DocsIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`${fmtInt(data.totals.converted)} convertidos`} />
            <StatCard label="Tasa de conversión" value={fmtPct(data.totals.conversion_rate)} icon={<CheckCircleIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`Cierre ${fmtPct(data.totals.win_rate)}`} />
            <StatCard label="Pipeline abierto" value={fmtUSD(data.totals.pipeline_value)} icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />} hint={`${fmtInt(data.totals.open_count)} presupuestos`} />
            <StatCard label="Rechazados" value={fmtInt(data.totals.rejected)} icon={<TaskIcon className="size-6 text-gray-800 dark:text-white/90" />} />
          </div>

          {/* Distribuciones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Presupuestos por estado" subtitle="Borrador, enviado, aprobado, rechazado, convertido">
              <DonutChart
                labels={data.by_status.map((s) => s.label)}
                series={data.by_status.map((s) => s.count)}
                colors={data.by_status.map((s) => STATUS_COLORS[s.status] ?? "#465fff")}
                valueFormatter={fmtInt}
                totalLabel="Presupuestos"
              />
            </ChartCard>
            <ChartCard className="lg:col-span-2" title="Emitidos vs. convertidos" subtitle="Por mes (rango seleccionado)">
              <LineChart
                categories={data.monthly.map((m) => m.label)}
                series={[
                  { name: "Emitidos", data: data.monthly.map((m) => m.issued), color: "#465fff" },
                  { name: "Convertidos", data: data.monthly.map((m) => m.converted), color: "#12b76a" },
                ]}
                valueFormatter={fmtInt}
                height={300}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ChartCard title="Servicios incluidos" subtitle="Presupuestos con instalación / despacho">
              <BarChart
                categories={data.extras.map((e) => e.label)}
                series={[{ name: "Presupuestos", data: data.extras.map((e) => e.count) }]}
                horizontal
                distributed
                valueFormatter={fmtInt}
                height={200}
              />
            </ChartCard>
            <ChartCard className="lg:col-span-2" title="Presupuestos de mayor valor" subtitle="Top por monto total">
              <RankTable ranked columns={quoteCols} rows={data.top_quotes} />
            </ChartCard>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
