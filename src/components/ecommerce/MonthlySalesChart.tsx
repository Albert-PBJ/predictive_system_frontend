import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { MonthlySalesPoint } from "../../services/statsService";
import { fmtCompactUSD, fmtUSD } from "../../utils/format";

/** Ingresos mensuales (USD) de los últimos 12 meses — datos reales de la BD. */
export default function MonthlySalesChart({ data }: { data: MonthlySalesPoint[] }) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 200,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "45%", borderRadius: 5, borderRadiusApplication: "end" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ["transparent"] },
    xaxis: {
      categories: data.map((d) => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: data.length > 8,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
    },
    legend: { show: false },
    yaxis: {
      labels: {
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
        formatter: (v: number) => fmtCompactUSD(v),
      },
    },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: {
      theme: dark ? "dark" : "light",
      x: { show: true },
      y: { formatter: (val: number) => fmtUSD(val) },
    },
  };
  const series = [{ name: "Ingresos", data: data.map((d) => d.revenue) }];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Ingresos mensuales</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Últimos 12 meses (ventas completadas)</p>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
          <Chart options={options} series={series} type="bar" height={200} />
        </div>
      </div>
    </div>
  );
}
