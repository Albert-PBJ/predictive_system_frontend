import { Link } from "react-router";
import ChartCard from "../stats/ChartCard";
import RankTable from "../stats/RankTable";
import Badge from "../ui/badge/Badge";
import type { CompetitiveBlock, PositioningRow } from "../../services/statsService";
import { fmtUSD } from "../../utils/format";

/**
 * Posición competitiva (instantánea "actual"): precio propio promedio vs. el mercado
 * scrapeado por categoría. Es una vista condensada; el detalle vive en el módulo
 * predictivo de competencia (`/predicciones/competencia`).
 */

const POSITION = {
  below: { color: "success" as const, label: "Por debajo" },
  within: { color: "warning" as const, label: "En rango" },
  above: { color: "error" as const, label: "Por encima" },
};

export default function CompetitivePanel({ data }: { data: CompetitiveBlock }) {
  const rows = data.positioning.filter((p) => p.own_avg !== null).slice(0, 6);

  return (
    <ChartCard
      title="Posición competitiva"
      subtitle="Precio propio vs. mercado (datos scrapeados · actual)"
      action={
        <Link
          to="/predicciones/competencia"
          className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Ver análisis →
        </Link>
      }
    >
      {data.price_score !== null && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-lg font-bold text-brand-600 dark:text-brand-400">
            {Math.round(data.price_score)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">Competitividad de precio</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              0 = mucho más caro que el mercado · 100 = mucho más barato
            </p>
          </div>
        </div>
      )}
      <RankTable<PositioningRow>
        rows={rows}
        empty="Aún no hay datos de competencia con productos comparables."
        columns={[
          { key: "category", label: "Categoría", render: (r) => <span className="font-medium">{r.category}</span> },
          { key: "own_avg", label: "Propio", align: "right", render: (r) => fmtUSD(r.own_avg) },
          { key: "comp_avg", label: "Mercado", align: "right", render: (r) => fmtUSD(r.comp_avg) },
          {
            key: "position",
            label: "Posición",
            align: "right",
            render: (r) =>
              r.position ? (
                <Badge color={POSITION[r.position as keyof typeof POSITION]?.color ?? "light"} size="sm">
                  {POSITION[r.position as keyof typeof POSITION]?.label ?? r.position}
                </Badge>
              ) : (
                "—"
              ),
          },
        ]}
      />
    </ChartCard>
  );
}
