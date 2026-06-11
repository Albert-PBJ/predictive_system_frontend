import ChartCard from "../stats/ChartCard";
import LineChart from "../stats/LineChart";
import type { ExchangeRateBlock } from "../../services/statsService";
import { fmtVES, fmtPct } from "../../utils/format";

/**
 * Contexto cambiario del rango: la tasa BCV y la paralela mueven toda la economía
 * dollar-pegada del negocio (y explican shocks de demanda como el de ene-2026). Se
 * muestran los extremos del periodo, la variación y la serie mensual.
 */
export default function ExchangeRateCard({ data }: { data: ExchangeRateBlock | null }) {
  if (!data) {
    return (
      <ChartCard title="Contexto cambiario" subtitle="Tasa BCV y paralela del periodo">
        <p className="py-8 text-center text-sm text-gray-400">Sin tasas registradas en el rango.</p>
      </ChartCard>
    );
  }

  const categories = data.series.map((p) => p.label);
  const series = [
    { name: "BCV", data: data.series.map((p) => p.bcv ?? 0), color: "#465fff" },
    { name: "Paralela", data: data.series.map((p) => p.parallel ?? 0), color: "#f79009" },
  ];

  const Metric = ({ label, value, pct }: { label: string; value: string; pct: number | null }) => {
    const up = (pct ?? 0) >= 0;
    return (
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-base font-semibold text-gray-800 dark:text-white/90">{value}</p>
        {pct !== null && (
          <p className={`text-xs font-medium ${up ? "text-error-500" : "text-success-500"}`}>
            {up ? "▲" : "▼"} {fmtPct(Math.abs(pct))} en el periodo
          </p>
        )}
      </div>
    );
  };

  return (
    <ChartCard title="Contexto cambiario" subtitle="Tasa BCV y paralela (Bs/USD) del periodo">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <Metric label="BCV al cierre" value={fmtVES(data.end_bcv)} pct={data.bcv_change_pct} />
        <Metric label="Paralela al cierre" value={fmtVES(data.end_parallel)} pct={data.parallel_change_pct} />
      </div>
      <LineChart
        categories={categories}
        series={series}
        type="line"
        height={220}
        valueFormatter={(v) => fmtVES(v)}
        showLegend
      />
    </ChartCard>
  );
}
