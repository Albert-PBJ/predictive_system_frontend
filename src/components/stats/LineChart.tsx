import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import { pickColors } from "./palette";
import type { BarSeries } from "./BarChart";

interface LineChartProps {
  categories: string[];
  series: BarSeries[];
  height?: number;
  type?: "line" | "area";
  valueFormatter?: (v: number) => string;
  colors?: string[];
  showLegend?: boolean;
}

/** Gráfico de líneas/área reutilizable para series mensuales (ingresos, conversión…). */
export default function LineChart({
  categories,
  series,
  height = 300,
  type = "area",
  valueFormatter = (v) => `${v}`,
  colors,
  showLegend,
}: LineChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  if (!categories.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Sin datos para mostrar
      </div>
    );
  }

  const resolvedColors = colors ?? series.map((s, i) => s.color ?? pickColors(series.length)[i]);

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type, toolbar: { show: false } },
    colors: resolvedColors,
    stroke: { curve: "smooth", width: 2 },
    fill:
      type === "area"
        ? { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } }
        : { type: "solid", opacity: 1 },
    markers: { size: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    legend: {
      show: showLegend ?? series.length > 1,
      position: "top",
      horizontalAlign: "left",
      labels: { colors: dark ? "#98a2b3" : "#475467" },
    },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: categories.length > 8,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
        formatter: (v: number) => valueFormatter(v),
      },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => valueFormatter(v) },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div style={{ minWidth: Math.max(categories.length * 56, 360) }}>
        <Chart options={options} series={series} type={type} height={height} />
      </div>
    </div>
  );
}
