import { useEffect, useState } from "react";
import Spinner from "../common/Spinner";
import { BoltIcon, CheckLineIcon } from "../../icons";
import { analyticsService, type ForecastAdvice, type ForecastAdviceParams } from "../../services/analyticsService";

/**
 * Tarjeta con la lectura accionable del pronóstico, redactada por el LLM a partir de los
 * resultados del modelo (con degradación a una lectura determinista del backend si el LLM
 * no está disponible). Se coloca debajo del gráfico y vuelve a generar cuando cambian los
 * parámetros (producto, horizonte, métrica…). No se muestra si la petición falla por
 * completo, para no estorbar.
 */
export default function ForecastAdviceCard({ params, enabled }: { params: ForecastAdviceParams; enabled: boolean }) {
  const [advice, setAdvice] = useState<ForecastAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sig = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    analyticsService
      .forecastAdvice(params)
      .then((d) => active && setAdvice(d))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // `sig` resume `params` (objeto recreado en cada render); recargamos al cambiar valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, enabled]);

  if (!enabled || failed) return null;

  return (
    <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-500/[0.06] p-5 dark:bg-brand-500/[0.08]">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500">
          <BoltIcon className="size-5" />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">Análisis del pronóstico</h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {advice?.available
              ? "Redactado con IA a partir de los resultados del modelo"
              : "Lectura automática de los resultados del modelo"}
          </p>
        </div>
      </div>

      {loading || !advice ? (
        <div className="flex items-center gap-2 py-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Analizando el pronóstico…
        </div>
      ) : (
        <>
          {advice.headline && (
            <p className="mb-1 text-base font-semibold text-gray-900 dark:text-white">{advice.headline}</p>
          )}
          {advice.reading && (
            <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{advice.reading}</p>
          )}
          {advice.recommendations && advice.recommendations.length > 0 && (
            <ul className="space-y-1.5">
              {advice.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <CheckLineIcon className="mt-0.5 size-4 shrink-0 text-brand-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
