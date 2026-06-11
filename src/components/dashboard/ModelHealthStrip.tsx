import { Link } from "react-router";
import type { ModelHealthRow } from "../../services/statsService";

/**
 * Salud de los modelos predictivos (instantánea): R² o exactitud del modelo activo
 * por objetivo. Refuerza el encuadre de "sistema predictivo" y da gobernanza de datos
 * (las decisiones se apoyan en modelos medidos). El detalle está en Predicciones.
 */
export default function ModelHealthStrip({ rows }: { rows: ModelHealthRow[] }) {
  if (!rows?.length) return null;

  const scoreOf = (r: ModelHealthRow): { value: string; pct: number } => {
    if (r.accuracy !== null && r.accuracy !== undefined) {
      return { value: `${Math.round(r.accuracy * 100)}%`, pct: r.accuracy * 100 };
    }
    if (r.r2 !== null && r.r2 !== undefined) {
      return { value: r.r2.toFixed(2), pct: Math.max(0, r.r2 * 100) };
    }
    return { value: "—", pct: 0 };
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Salud de los modelos</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Precisión del modelo activo por objetivo (R² / exactitud · actual)
          </p>
        </div>
        <Link
          to="/predicciones"
          className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Ver modelos →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((r) => {
          const s = scoreOf(r);
          const color = s.pct >= 80 ? "#12b76a" : s.pct >= 60 ? "#f79009" : "#f04438";
          return (
            <div key={r.model_type} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <p className="truncate text-xs text-gray-500 dark:text-gray-400" title={r.model_type_display}>
                {r.model_type_display}
              </p>
              <p className="mt-1 text-lg font-bold text-gray-800 dark:text-white/90">{s.value}</p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full" style={{ width: `${Math.min(s.pct, 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
