import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import { pickColors } from "./palette";

interface DonutChartProps {
  labels: string[];
  series: number[];
  colors?: string[];
  height?: number;
  /** Formatea el valor en tooltips y total central (por defecto, entero). */
  valueFormatter?: (v: number) => string;
  totalLabel?: string;
}

/** Gráfico de dona reutilizable (distribución por categorías) con total central. */
export default function DonutChart({
  labels,
  series,
  colors,
  height = 280,
  valueFormatter = (v) => `${v}`,
  totalLabel = "Total",
}: DonutChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  if (!series.length || series.every((v) => v === 0)) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
        Sin datos para mostrar
      </div>
    );
  }

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "donut" },
    labels,
    colors: colors ?? pickColors(labels.length),
    stroke: { width: 0 },
    legend: {
      position: "bottom",
      labels: { colors: dark ? "#98a2b3" : "#475467" },
      fontSize: "12px",
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: { fontSize: "11px" },
      dropShadow: { enabled: false },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "62%",
          labels: {
            show: true,
            total: {
              show: true,
              label: totalLabel,
              color: dark ? "#98a2b3" : "#667085",
              fontSize: "13px",
              formatter: (w) =>
                valueFormatter(
                  (w.globals.seriesTotals as number[]).reduce((a, b) => a + b, 0),
                ),
            },
            value: {
              color: dark ? "#e4e7ec" : "#1d2939",
              fontSize: "20px",
              fontWeight: 600,
              formatter: (val: string) => valueFormatter(Number(val)),
            },
          },
        },
      },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: { formatter: (v: number) => valueFormatter(v) },
    },
  };

  return <Chart options={options} series={series} type="donut" height={height} />;
}
