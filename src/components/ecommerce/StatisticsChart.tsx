import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { MonthlySalesPoint } from "../../services/statsService";
import { fmtInt, fmtUSD } from "../../utils/format";

/**
 * Tendencia mensual del panel de Inicio: ingresos (área, eje izquierdo) y número
 * de ventas (línea, eje derecho). Datos reales de `/stats/dashboard`.
 */
export default function StatisticsChart({ data }: { data: MonthlySalesPoint[] }) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const options: ApexOptions = {
    legend: { show: true, position: "top", horizontalAlign: "left", labels: { colors: dark ? "#98a2b3" : "#475467" } },
    colors: ["#465FFF", "#12b76a"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
    },
    stroke: { curve: "smooth", width: [2, 2] },
    fill: { type: ["gradient", "solid"], gradient: { opacityFrom: 0.45, opacityTo: 0 } },
    markers: { size: 0, hover: { size: 6 } },
    grid: {
      borderColor: dark ? "#1d2939" : "#f2f4f7",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number, opts) =>
          opts?.seriesIndex === 0 ? fmtUSD(val) : `${fmtInt(val)} ventas`,
      },
    },
    xaxis: {
      type: "category",
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: data.length > 8,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
      tooltip: { enabled: false },
    },
    yaxis: [
      {
        labels: {
          style: { fontSize: "12px", colors: [dark ? "#98a2b3" : "#6B7280"] },
          formatter: (v: number) => fmtUSD(v),
        },
        title: { text: "Ingresos", style: { color: dark ? "#98a2b3" : "#667085", fontSize: "11px" } },
      },
      {
        opposite: true,
        labels: {
          style: { fontSize: "12px", colors: [dark ? "#98a2b3" : "#6B7280"] },
          formatter: (v: number) => fmtInt(v),
        },
        title: { text: "Nº ventas", style: { color: dark ? "#98a2b3" : "#667085", fontSize: "11px" } },
      },
    ],
  };

  const series = [
    { name: "Ingresos", type: "area", data: data.map((d) => d.revenue) },
    { name: "Ventas", type: "line", data: data.map((d) => d.count) },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Ventas e ingresos</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Evolución mensual de los últimos 12 meses</p>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <Chart options={options} series={series} type="line" height={310} />
        </div>
      </div>
    </div>
  );
}
