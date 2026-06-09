import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import { pickColors } from "./palette";

export interface BarSeries {
  name: string;
  data: number[];
  color?: string;
}

interface BarChartProps {
  categories: string[];
  series: BarSeries[];
  horizontal?: boolean;
  stacked?: boolean;
  /** Una sola serie con un color distinto por barra. */
  distributed?: boolean;
  height?: number;
  valueFormatter?: (v: number) => string;
  colors?: string[];
  /** Mostrar leyenda (útil con varias series). */
  showLegend?: boolean;
  minWidth?: number;
}

/** Gráfico de barras reutilizable (vertical/horizontal, simple/apilado). */
export default function BarChart({
  categories,
  series,
  horizontal = false,
  stacked = false,
  distributed = false,
  height = 300,
  valueFormatter = (v) => `${v}`,
  colors,
  showLegend,
  minWidth,
}: BarChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  if (!categories.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        Sin datos para mostrar
      </div>
    );
  }

  const resolvedColors =
    colors ??
    (distributed
      ? pickColors(categories.length)
      : series.map((s, i) => s.color ?? pickColors(series.length)[i]));

  const legend = showLegend ?? series.length > 1;

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      stacked,
      toolbar: { show: false },
    },
    colors: resolvedColors,
    plotOptions: {
      bar: {
        horizontal,
        distributed,
        borderRadius: 4,
        borderRadiusApplication: "end",
        columnWidth: "55%",
        barHeight: "65%",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: stacked ? 0 : 2, colors: ["transparent"] },
    legend: {
      show: legend && !distributed,
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
        rotate: horizontal ? 0 : -45,
        rotateAlways: !horizontal && categories.length > 8,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
        // En horizontal el eje X es el de valores (numérico); si llegara una
        // categoría (string) se muestra tal cual en vez de "—".
        formatter: horizontal
          ? (v: string) => (Number.isFinite(Number(v)) ? valueFormatter(Number(v)) : String(v))
          : undefined,
      },
    },
    yaxis: {
      labels: {
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
        formatter: horizontal ? undefined : (v: number) => valueFormatter(v),
      },
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: stacked,
      intersect: !stacked,
      y: { formatter: (v: number) => valueFormatter(v) },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div style={{ minWidth: minWidth ?? (horizontal ? 0 : Math.max(categories.length * 48, 320)) }}>
        <Chart options={options} series={series} type="bar" height={height} />
      </div>
    </div>
  );
}
