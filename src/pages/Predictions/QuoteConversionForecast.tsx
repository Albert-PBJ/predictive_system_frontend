import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import ModelMetricsCard from "../../components/analytics/ModelMetricsCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useTheme } from "../../context/ThemeContext";
import { analyticsService, type QuoteConversionResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";
import { fmtUSD } from "../../utils/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

function probColor(p: number): "success" | "warning" | "error" {
  if (p >= 0.66) return "success";
  if (p >= 0.4) return "warning";
  return "error";
}

export default function QuoteConversionForecast() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [data, setData] = useState<QuoteConversionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    analyticsService
      .quoteConversion()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar la conversión de presupuestos.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const gaugeOptions: ApexOptions = {
    chart: { type: "radialBar", fontFamily: "Outfit, sans-serif" },
    colors: ["#465fff"],
    plotOptions: {
      radialBar: {
        hollow: { size: "62%" },
        track: { background: dark ? "#1d2939" : "#f2f4f7" },
        dataLabels: {
          name: { offsetY: 22, color: dark ? "#98a2b3" : "#667085", fontSize: "13px" },
          value: { offsetY: -18, fontSize: "28px", fontWeight: 600, color: dark ? "#fff" : "#1d2939", formatter: (v) => `${Math.round(v)}%` },
        },
      },
    },
    labels: ["Conversión esperada"],
    stroke: { lineCap: "round" },
  };

  const monthlyOptions: ApexOptions = {
    chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
    colors: ["#465fff"],
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
    dataLabels: { enabled: false },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories: (data?.monthly_rate || []).map((m) => m.label),
      labels: { rotate: -45, rotateAlways: (data?.monthly_rate.length || 0) > 10, style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { max: 100, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: dark ? "#98a2b3" : "#667085" } } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v) => `${v}%` } },
  };

  return (
    <>
      <PageMeta title="Conversión de presupuestos" description="Probabilidad de cierre y pipeline esperado" />
      <PageBreadcrumb pageTitle="Conversión de presupuestos" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Modelo de clasificación (<strong>árbol de decisión</strong>) que estima la probabilidad de que un presupuesto
        se convierta en venta, a partir de su tamaño, si incluye instalación/despacho, el tipo de cliente y el shock
        cambiario al emitirse. Con ello se valora el pipeline abierto.
      </p>

      {error && <Alert variant="error" title="Error" message={error} />}

      {loading ? (
        <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Calculando…
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Gauge */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pipeline abierto</h4>
              <Chart options={gaugeOptions} series={[data.pipeline.expected_rate_pct]} type="radialBar" height={260} />
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {data.pipeline.open_count} presupuestos abiertos
              </p>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">
              <Stat label="Ingreso esperado del pipeline" value={fmtUSD(data.pipeline.expected_revenue_usd)} />
              <Stat label="Valor total del pipeline" value={fmtUSD(data.pipeline.total_value_usd)} />
              <Stat label="Conversión histórica (cerrados)" value={`${data.historical_conversion_rate}%`} />
              <Stat label="Presupuestos abiertos" value={String(data.pipeline.open_count)} />
            </div>
          </div>

          {/* Tasa de conversión mensual */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Tasa de conversión mensual</h4>
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[640px]">
                <Chart options={monthlyOptions} series={[{ name: "Conversión", data: data.monthly_rate.map((m) => m.value) }]} type="bar" height={260} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Pipeline table */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                Presupuestos abiertos por probabilidad de cierre
              </h4>
              <div className="max-h-[420px] max-w-full overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <TableRow>
                      {["Presupuesto", "Cliente", "Total", "Probabilidad", "Esperado"].map((h) => (
                        <TableCell key={h} isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.pipeline.quotes.length === 0 ? (
                      <TableRow>
                        <TableCell className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No hay presupuestos abiertos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.pipeline.quotes.slice(0, 50).map((q) => (
                        <TableRow key={q.id}>
                          <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{q.quote_number}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{q.customer}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(q.total_usd)}</TableCell>
                          <TableCell className="px-3 py-2.5">
                            <Badge variant="light" color={probColor(q.probability)} size="sm">
                              {Math.round(q.probability * 100)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-sm font-semibold text-gray-800 dark:text-white/90">{fmtUSD(q.expected_usd)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <ModelMetricsCard model={data.model} />
          </div>
        </>
      )}
    </>
  );
}
