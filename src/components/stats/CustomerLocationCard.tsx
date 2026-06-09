import type { StateCount } from "../../services/statsService";
import { fmtInt } from "../../utils/format";
import BarChart from "./BarChart";
import ChartCard from "./ChartCard";

interface CustomerLocationCardProps {
  data: StateCount[];
  title?: string;
  subtitle?: string;
  /** Limita a los N estados con más clientes. */
  max?: number;
  height?: number;
}

/**
 * Distribución de clientes por estado venezolano (barras horizontales).
 * Reutilizado en el panel de Inicio y en la página de estadísticas de clientes.
 */
export default function CustomerLocationCard({
  data,
  title = "Distribución de clientes",
  subtitle = "Cantidad de clientes por estado",
  max = 8,
  height,
}: CustomerLocationCardProps) {
  const top = [...data].sort((a, b) => b.count - a.count).slice(0, max);
  const categories = top.map((d) => d.state);
  const series = [{ name: "Clientes", data: top.map((d) => d.count) }];

  return (
    <ChartCard title={title} subtitle={subtitle}>
      <BarChart
        categories={categories}
        series={series}
        horizontal
        distributed
        valueFormatter={fmtInt}
        height={height ?? Math.max(top.length * 38, 220)}
      />
    </ChartCard>
  );
}
