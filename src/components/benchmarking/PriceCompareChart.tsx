import { useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { ForecastPoint } from "../../services/analyticsService";
import { fmtValue } from "../analytics/format";

export interface CompareSeries {
  label: string;
  color: string;
  history: ForecastPoint[];
  forecast: ForecastPoint[];
}

interface Props {
  series: CompareSeries[];
  height?: number;
}

/**
 * Compara varias series de precio en un mismo eje: cada serie se dibuja con su
 * histórico (línea sólida) y su pronóstico (línea discontinua) del mismo color. Pensado
 * para enfrentar el precio de un competidor con nuestro precio interno de un producto.
 */
export default function PriceCompareChart({ series, height = 360 }: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  // Eje unificado de periodos (orden cronológico por la cadena "YYYY-MM").
  const { axisPeriods, axisLabels } = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach((s) =>
      [...s.history, ...s.forecast].forEach((p) => map.set(p.period, p.label)),
    );
    const periods = [...map.keys()].sort();
    return { axisPeriods: periods, axisLabels: periods.map((p) => map.get(p) as string) };
  }, [series]);

  // react-apexcharts compara opciones/series con un deep-equal que trata como iguales
  // dos funciones-cierre distintas; al cambiar de producto/competidor en los desplegables
  // puede reutilizar el gráfico por la vía updateSeries y conservar formatters/tooltip
  // obsoletos, rompiendo el popup al pasar el cursor. Una key derivada de los datos fuerza
  // el remontaje con cierres frescos en cada cambio.
  const chartKey = useMemo(
    () =>
      series
        .map((s) => {
          const sig = (pts: ForecastPoint[]) => pts.map((p) => `${p.period}:${p.value}`).join(",");
          return `${s.label}|${sig(s.history)}|${sig(s.forecast)}`;
        })
        .join("#"),
    [series],
  );

  if (!axisPeriods.length) {
    return <div className="flex h-72 items-center justify-center text-sm text-gray-400">Sin datos para mostrar</div>;
  }

  type XY = { x: string; y: number | null };
  const apexSeries: ApexAxisChartSeries = [];
  const colors: string[] = [];
  const dashArray: number[] = [];
  const widths: number[] = [];

  series.forEach((s) => {
    const hist = new Map(s.history.map((p) => [p.period, p.value]));
    const fc = new Map(s.forecast.map((p) => [p.period, p.value]));
    const lastHistPeriod = s.history.length ? s.history[s.history.length - 1].period : null;

    const histData: XY[] = axisPeriods.map((p, i) => ({ x: axisLabels[i], y: hist.has(p) ? (hist.get(p) as number) : null }));
    const fcData: XY[] = axisPeriods.map((p, i) => {
      if (p === lastHistPeriod) return { x: axisLabels[i], y: hist.get(p) as number }; // puente histórico→pronóstico
      return { x: axisLabels[i], y: fc.has(p) ? (fc.get(p) as number) : null };
    });
    apexSeries.push({ name: `${s.label} · histórico`, data: histData });
    apexSeries.push({ name: `${s.label} · pronóstico`, data: fcData });
    colors.push(s.color, s.color);
    dashArray.push(0, 6);
    widths.push(3, 3);
  });

  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", type: "line", toolbar: { show: false } },
    colors,
    stroke: { curve: "smooth", width: widths, dashArray },
    markers: { size: 0, hover: { size: 5 } },
    dataLabels: { enabled: false },
    legend: { show: true, position: "top", horizontalAlign: "left", labels: { colors: dark ? "#98a2b3" : "#475467" } },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories: axisLabels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: axisLabels.length > 8,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => fmtValue(v, "usd"),
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => (v == null ? "—" : fmtValue(v, "usd")) },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[640px]" style={{ minHeight: height }}>
        <Chart key={chartKey} options={options} series={apexSeries} type="line" height={height} />
      </div>
    </div>
  );
}
