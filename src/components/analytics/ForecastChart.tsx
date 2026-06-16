import { useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { ForecastPoint, ValueKind } from "../../services/analyticsService";
import { fmtValue } from "./format";

export type ChartKind = "area" | "line" | "bar";

interface YAnnotation {
  y: number;
  label: string;
  color?: string;
}

interface ExtraSeries {
  name: string;
  data: (number | null)[]; // alineado a history+forecast
  color?: string;
}

interface ForecastChartProps {
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  valueKind: ValueKind;
  unit?: string;
  type?: ChartKind;
  showBand?: boolean;
  height?: number;
  selectedPeriod?: string | null;
  onSelectPeriod?: (period: string) => void;
  yAnnotations?: YAnnotation[];
  extraSeries?: ExtraSeries[];
  logScale?: boolean;
}

/**
 * Gráfico de pronóstico reutilizable: histórico (línea/área sólida) + pronóstico
 * (línea discontinua) + banda de confianza sombreada (rangeArea). Al hacer clic en
 * un punto/barra se selecciona ese período (para el botón "Ver datos").
 */
export default function ForecastChart({
  history,
  forecast,
  valueKind,
  unit = "",
  type = "area",
  showBand = true,
  height = 340,
  selectedPeriod = null,
  onSelectPeriod,
  yAnnotations = [],
  extraSeries = [],
  logScale = false,
}: ForecastChartProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const all = useMemo(() => [...history, ...forecast], [history, forecast]);
  const categories = all.map((p) => p.label);
  const periods = all.map((p) => p.period);
  const nH = history.length;

  const isBar = type === "bar";
  // La banda de confianza (rangeArea) exige que el `chart.type` global sea
  // "rangeArea"; de lo contrario ApexCharts nunca llena `seriesRangeEnd` y el
  // dibujo revienta. Por eso, cuando hay banda, el tipo del gráfico pasa a ser
  // "rangeArea" (los demás trazos conservan su tipo por serie) y todas las
  // series usan formato {x, y} para que el rango se interprete correctamente.
  const useBand = showBand && !isBar && forecast.some((f) => f.lower !== undefined);
  const chartType: "bar" | "line" | "rangeArea" = isBar ? "bar" : useBand ? "rangeArea" : "line";

  // react-apexcharts compara opciones/series con un deep-equal que considera iguales
  // dos funciones-cierre distintas; por eso, cuando solo cambian los datos pero el eje
  // se mantiene (p. ej. al cambiar de producto en el desplegable: mismos meses), cree
  // que las opciones no cambiaron y reutiliza el gráfico por la vía updateSeries,
  // conservando un tooltip.custom obsoleto que apunta a los datos anteriores: el popup
  // se rompe al pasar el cursor (y el redibujo de error provoca el "salto"/scroll).
  // Forzamos el remontaje con una key derivada de los datos para reconstruir el gráfico
  // con cierres frescos. La selección de período no entra en la key (solo mueve una
  // anotación) para que inspeccionar meses siga siendo fluido.
  const chartKey = useMemo(() => {
    const sig = (pts: ForecastPoint[]) =>
      pts.map((p) => `${p.period}:${p.value}:${p.lower ?? ""}:${p.upper ?? ""}`).join(",");
    const ex = extraSeries.map((s) => `${s.name}=${s.data.join("|")}`).join(";");
    return `${chartType}#${sig(history)}#${sig(forecast)}#${ex}`;
  }, [chartType, history, forecast, extraSeries]);

  // Series en formato {x, y}, de longitud completa y alineadas por índice.
  type XY = { x: string; y: number | null };
  type XYBand = { x: string; y: [number, number] };

  const histData: XY[] = all.map((p, i) => ({ x: p.label, y: i < nH ? p.value : null }));
  const fcData: XY[] = all.map((p, i) => {
    if (i === nH - 1) return { x: p.label, y: history[nH - 1]?.value ?? null }; // une histórico y pronóstico
    if (i >= nH) return { x: p.label, y: forecast[i - nH].value };
    return { x: p.label, y: null };
  });
  // En el tramo histórico la banda es degenerada [v, v] (alto cero → invisible);
  // en el pronóstico es [inferior, superior]. Sin nulos para no romper el parseo.
  const bandData: XYBand[] = all.map((p, i) => {
    if (i < nH) {
      const v = history[i].value;
      return { x: p.label, y: [v, v] };
    }
    const f = forecast[i - nH];
    return { x: p.label, y: [f.lower ?? f.value, f.upper ?? f.value] };
  });

  // Banda de confianza en ámbar (asociada al pronóstico naranja, no se confunde
  // con el azul del histórico) y con borde visible para que se aprecie con claridad.
  const bandColor = "#f79009";
  const histColor = "#465fff";
  const fcColor = "#fb6514";

  const series: ApexAxisChartSeries = [];
  if (useBand) series.push({ name: "Intervalo (~90%)", type: "rangeArea", data: bandData as never });
  series.push({ name: "Histórico", type: isBar ? "bar" : type, data: histData });
  series.push({ name: "Pronóstico", type: isBar ? "bar" : "line", data: fcData });
  extraSeries.forEach((s) =>
    series.push({ name: s.name, type: "line", data: s.data.map((y, i) => ({ x: categories[i], y })) })
  );

  // Arreglos de estilo alineados a la lista real de series (la banda es opcional).
  const colors = [
    ...(useBand ? [bandColor] : []),
    histColor,
    fcColor,
    ...extraSeries.map((s) => s.color || "#12b76a"),
  ];
  // La banda lleva borde visible (1.5px discontinuo) y relleno sólido más nítido.
  const strokeWidth = [...(useBand ? [1.5] : []), 3, 3, ...extraSeries.map(() => 2)];
  const strokeDash = [...(useBand ? [4] : []), 0, 6, ...extraSeries.map(() => 0)];
  const fillType = [...(useBand ? ["solid"] : []), "gradient", "solid", ...extraSeries.map(() => "solid")];
  const fillOpacity = [...(useBand ? [0.28] : []), 0.25, 1, ...extraSeries.map(() => 1)];

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height,
      type: chartType,
      toolbar: { show: false },
      animations: { enabled: true },
      events: {
        dataPointSelection: (_e, _ctx, cfg) => {
          const idx = cfg.dataPointIndex;
          if (idx >= 0 && idx < periods.length && onSelectPeriod) onSelectPeriod(periods[idx]);
        },
        markerClick: (_e, _ctx, cfg) => {
          const idx = cfg.dataPointIndex;
          if (idx >= 0 && idx < periods.length && onSelectPeriod) onSelectPeriod(periods[idx]);
        },
      },
    },
    colors,
    stroke: {
      curve: "smooth",
      width: isBar ? 0 : strokeWidth,
      dashArray: isBar ? 0 : strokeDash,
    },
    fill: {
      type: isBar ? "solid" : fillType,
      opacity: isBar ? 0.9 : fillOpacity,
      gradient: { opacityFrom: 0.4, opacityTo: 0.05 },
    },
    markers: { size: 0, hover: { size: 5 } },
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 4 } },
    dataLabels: { enabled: false },
    legend: { show: true, position: "top", horizontalAlign: "left", labels: { colors: dark ? "#98a2b3" : "#475467" } },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        rotateAlways: categories.length > 10,
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      logarithmic: logScale,
      labels: {
        style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" },
        formatter: (v: number) => fmtValue(v, valueKind),
      },
      title: { text: unit, style: { color: dark ? "#98a2b3" : "#667085", fontSize: "11px", fontWeight: 500 } },
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      // Tooltip propio: el tooltip por defecto + la serie rangeArea ocultaba el
      // valor pronosticado. Aquí mostramos siempre el valor (histórico o
      // pronóstico), el intervalo ~90% y cualquier serie extra para el mes.
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        const i = dataPointIndex;
        if (i < 0 || i >= all.length) return "";
        const isFc = i >= nH;
        const mark = (c: string) =>
          `<span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${c};margin-right:6px;flex:none"></span>`;
        const line = (c: string, name: string, val: string) =>
          `<div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;gap:14px">` +
          `<span style="display:flex;align-items:center">${mark(c)}${name}</span>` +
          `<span style="font-weight:600">${val}</span></div>`;
        const rows: string[] = [];
        const mainVal = isFc ? forecast[i - nH]?.value : history[i]?.value;
        if (mainVal !== null && mainVal !== undefined)
          rows.push(line(isFc ? fcColor : histColor, isFc ? "Pronóstico" : "Histórico", fmtValue(mainVal, valueKind)));
        if (isFc && useBand) {
          const f = forecast[i - nH];
          if (f?.lower !== undefined && f?.upper !== undefined)
            rows.push(line(bandColor, "Intervalo (~90%)", `${fmtValue(f.lower, valueKind)} – ${fmtValue(f.upper, valueKind)}`));
        }
        extraSeries.forEach((s) => {
          const v = s.data[i];
          if (v !== null && v !== undefined) rows.push(line(s.color || "#12b76a", s.name, fmtValue(v, valueKind)));
        });
        if (!rows.length) return "";
        return (
          `<div style="padding:6px 10px;min-width:170px;font-size:12px">` +
          `<div style="font-weight:600;margin-bottom:4px">${all[i].label}</div>${rows.join("")}</div>`
        );
      },
    },
    annotations: {
      xaxis:
        selectedPeriod && periods.includes(selectedPeriod)
          ? [{
              x: categories[periods.indexOf(selectedPeriod)],
              borderColor: "#fb6514",
              strokeDashArray: 3,
              label: { text: "Seleccionado", style: { color: "#fff", background: "#fb6514", fontSize: "10px" } },
            }]
          : [],
      yaxis: yAnnotations.map((a) => ({
        y: a.y,
        borderColor: a.color || "#f79009",
        strokeDashArray: 4,
        label: { text: a.label, style: { color: "#fff", background: a.color || "#f79009", fontSize: "10px" } },
      })),
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div className="min-w-[640px]" style={{ minHeight: height }}>
        <Chart key={chartKey} options={options} series={series} type={chartType} height={height} />
      </div>
    </div>
  );
}
