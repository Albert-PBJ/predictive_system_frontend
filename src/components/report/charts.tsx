// Primitivas de gráfico para el PDF ejecutivo (react-pdf). No usamos ApexCharts aquí
// (no renderiza en el reconciler de react-pdf): las barras se dibujan con cajas
// flexbox y las líneas con SVG nativo. Todo es función pura de sus props.

import { View, Text, Svg, Polyline, Line, Circle } from "@react-pdf/renderer";

export const palette = {
  brand: "#465fff",
  green: "#12b76a",
  amber: "#f79009",
  red: "#f04438",
  sky: "#36bffa",
  violet: "#7a5af8",
  ink: "#1d2939",
  body: "#475467",
  muted: "#98a2b3",
  grid: "#e4e7ec",
  track: "#f2f4f7",
};

// Paleta cíclica para series sin color asignado.
export const SERIES_COLORS = [palette.brand, palette.amber, palette.green, palette.violet, palette.sky, palette.red];

const fmtNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

interface BarSeries {
  name: string;
  color: string;
  data: number[];
}

/** Barras verticales agrupadas (1-2 series). Alturas relativas al máximo del set. */
export function VBars({
  labels,
  series,
  height = 140,
  valueFmt = fmtNum,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  valueFmt?: (n: number) => string;
}) {
  const all = series.flatMap((s) => s.data);
  const max = Math.max(1, ...all);
  const many = labels.length > 8;
  const barW = series.length > 1 ? 5 : 12;
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
        <Text style={{ fontSize: 6, color: palette.muted }}>Máx: {valueFmt(max)}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          height,
          borderBottomWidth: 1,
          borderBottomColor: palette.grid,
        }}
      >
        {labels.map((_, i) => (
          <View key={i} style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
            {series.map((s, si) => (
              <View
                key={si}
                style={{
                  width: barW,
                  height: Math.max(1, (s.data[i] / max) * (height - 2)),
                  backgroundColor: s.color,
                  marginHorizontal: 1,
                  borderTopLeftRadius: 1.5,
                  borderTopRightRadius: 1.5,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginTop: 2 }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 5.5, color: palette.muted }}>
            {many && i % 2 === 1 ? "" : trunc(l, 7)}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Barras horizontales (ranking / componentes). */
export function HBars({
  items,
  valueFmt = fmtNum,
  labelWidth = 116,
}: {
  items: { label: string; value: number; color?: string }[];
  valueFmt?: (n: number) => string;
  labelWidth?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <Empty />;
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ width: labelWidth, fontSize: 8, color: palette.body }}>{trunc(it.label, 24)}</Text>
          <View style={{ flex: 1, height: 10, backgroundColor: palette.track, borderRadius: 2 }}>
            <View
              style={{
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                height: 10,
                backgroundColor: it.color ?? palette.brand,
                borderRadius: 2,
              }}
            />
          </View>
          <Text style={{ width: 58, fontSize: 8, textAlign: "right", color: palette.ink }}>{valueFmt(it.value)}</Text>
        </View>
      ))}
    </View>
  );
}

/** Barra apilada 100% (composición) + leyenda con valor y porcentaje. */
export function StackBar({
  segments,
  valueFmt = fmtNum,
}: {
  segments: { label: string; value: number; color: string }[];
  valueFmt?: (n: number) => string;
}) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
  return (
    <View>
      <View style={{ flexDirection: "row", height: 20, borderRadius: 4, overflow: "hidden" }}>
        {segments.map((s, i) => (
          <View key={i} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
        ))}
      </View>
      <View style={{ marginTop: 8 }}>
        {segments.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
            <View style={{ width: 9, height: 9, backgroundColor: s.color, borderRadius: 2, marginRight: 6 }} />
            <Text style={{ fontSize: 8.5, color: palette.body, flex: 1 }}>{s.label}</Text>
            <Text style={{ fontSize: 8.5, color: palette.ink }}>
              {valueFmt(s.value)} · {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface LineSeries {
  name: string;
  color: string;
  /** Puntos alineados a `labels`; `null` deja hueco (p.ej. tramo de pronóstico). */
  data: (number | null)[];
  dashed?: boolean;
}

/** Gráfico de líneas SVG. Soporta tramos sólidos (historia) y punteados (pronóstico)
 *  y un divisor vertical opcional (límite historia/futuro). Sin texto SVG: las
 *  etiquetas de eje van como <Text> normal debajo para evitar fricciones de tipos. */
export function LineChartPdf({
  labels,
  series,
  width = 250,
  height = 140,
  divider,
}: {
  labels: string[];
  series: LineSeries[];
  width?: number;
  height?: number;
  /** Índice de etiqueta donde dibujar la línea divisoria (historia | futuro). */
  divider?: number;
}) {
  const all = series.flatMap((s) => s.data).filter((v): v is number => v != null);
  if (!all.length || labels.length < 2) return <Empty />;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) max = min + 1;
  // Margen del 8% para que las líneas no toquen los bordes.
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;

  const plotL = 6;
  const plotR = width - 6;
  const plotT = 8;
  const plotB = height - 4;
  const n = labels.length;
  const xAt = (i: number) => plotL + (i / (n - 1)) * (plotR - plotL);
  const yAt = (v: number) => plotB - ((v - min) / (max - min)) * (plotB - plotT);

  // Convierte una serie (con posibles huecos) en tramos contiguos de puntos.
  const runs = (data: (number | null)[]) => {
    const out: { i: number; v: number }[][] = [];
    let cur: { i: number; v: number }[] = [];
    data.forEach((v, i) => {
      if (v == null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else {
        cur.push({ i, v });
      }
    });
    if (cur.length) out.push(cur);
    return out;
  };

  const labelIdx = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* eje base */}
        <Line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke={palette.grid} strokeWidth={1} />
        {divider != null && divider > 0 && divider < n - 1 && (
          <Line
            x1={xAt(divider)}
            y1={plotT}
            x2={xAt(divider)}
            y2={plotB}
            stroke={palette.muted}
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        )}
        {series.map((s, si) =>
          runs(s.data).map((run, ri) => (
            <Polyline
              key={`${si}-${ri}`}
              points={run.map((p) => `${xAt(p.i).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "4 3" : undefined}
            />
          )),
        )}
        {/* punto final de cada serie */}
        {series.map((s, si) => {
          const last = [...s.data].map((v, i) => ({ v, i })).reverse().find((p) => p.v != null);
          if (!last || last.v == null) return null;
          return <Circle key={`c${si}`} cx={xAt(last.i)} cy={yAt(last.v)} r={2} fill={s.color} />;
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 2 }}>
        {labelIdx.map((idx, k) => (
          <Text
            key={k}
            style={{
              flex: 1,
              fontSize: 6,
              color: palette.muted,
              textAlign: k === 0 ? "left" : k === 1 ? "center" : "right",
            }}
          >
            {labels[idx]}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Medidor del IVC: barra 0-100 con color por estado + número grande. */
export function GaugeBar({ score, color, label }: { score: number; color: string; label: string }) {
  const s = Math.max(0, Math.min(100, score));
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: "bold", color }}>{Math.round(s)}</Text>
        <Text style={{ fontSize: 10, color: palette.muted, marginBottom: 5, marginLeft: 2 }}>/ 100</Text>
        <Text style={{ fontSize: 9, fontWeight: "bold", color, marginLeft: "auto", marginBottom: 6 }}>{label}</Text>
      </View>
      <View style={{ height: 12, backgroundColor: palette.track, borderRadius: 6 }}>
        <View style={{ width: `${s}%`, height: 12, backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
}

/** Leyenda horizontal de series. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
          <View style={{ width: 8, height: 8, backgroundColor: it.color, borderRadius: 2, marginRight: 4 }} />
          <Text style={{ fontSize: 7.5, color: palette.body }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Empty() {
  return (
    <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 8, color: palette.muted }}>Sin datos suficientes en el periodo.</Text>
    </View>
  );
}
