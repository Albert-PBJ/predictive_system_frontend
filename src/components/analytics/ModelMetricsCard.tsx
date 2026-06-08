import Badge from "../ui/badge/Badge";
import { fmtDate } from "../../utils/format";
import type { ModelInfo } from "../../services/analyticsService";
import { featureLabel, featureHint } from "./featureLabels";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">{value}</p>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

const fmt = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("es-VE", { maximumFractionDigits: digits });

/**
 * Tarjeta con el modelo usado y sus métricas de evaluación (holdout temporal).
 * Muestra R²/RMSE/MAE para regresión o exactitud/precisión/recall para clasificación,
 * más hiperparámetros e importancia de variables.
 */
export default function ModelMetricsCard({ model }: { model: ModelInfo | null }) {
  if (!model) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        Aún no hay un modelo entrenado (datos insuficientes).
      </div>
    );
  }

  const isClassifier = model.accuracy !== undefined && model.accuracy !== null;
  const importances = (model.feature_importances || []).slice(0, 6);
  const maxImp = importances.length ? Math.max(...importances.map((i) => i.importance)) : 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Modelo</h4>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">{model.label || model.key}</p>
        </div>
        {model.library && (
          <Badge variant="light" color="info" size="sm">
            {model.library}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {isClassifier ? (
          <>
            <Metric label="Exactitud" value={fmt(model.accuracy, 3)} />
            <Metric label="Precisión" value={fmt(model.precision, 3)} />
            <Metric label="Recall" value={fmt(model.recall, 3)} />
          </>
        ) : (
          <>
            <Metric label="R²" value={fmt(model.r2, 3)} hint="bondad de ajuste" />
            <Metric label="RMSE" value={fmt(model.rmse)} hint="error cuadrático" />
            <Metric label="MAE" value={fmt(model.mae)} hint="error absoluto" />
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {model.n_train !== undefined && <span>Entrenamiento: {model.n_train} obs.</span>}
        {model.n_holdout ? <span>Validación: {model.n_holdout} obs.</span> : null}
        {model.trained_at && <span>Entrenado: {fmtDate(model.trained_at)}</span>}
      </div>

      {importances.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Variables más influyentes</p>
          <div className="space-y-2">
            {importances.map((imp) => (
              <div key={imp.feature} className="flex items-center gap-2">
                <span
                  className="w-40 shrink-0 truncate text-xs text-gray-600 dark:text-gray-300"
                  title={featureHint(imp.feature)}
                >
                  {featureLabel(imp.feature)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(imp.importance / maxImp) * 100}%` }} />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] text-gray-400">
                  {(imp.importance * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {model.hyperparameters && Object.keys(model.hyperparameters).length > 0 && (
        <details className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <summary className="cursor-pointer select-none">Hiperparámetros</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(model.hyperparameters).map(([k, v]) => (
              <span key={k} className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-800">
                {k}: <span className="font-medium text-gray-700 dark:text-gray-200">{String(v)}</span>
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
