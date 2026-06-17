import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ForecastView from "../../components/analytics/ForecastView";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

export default function ProfitForecast() {
  const [horizon, setHorizon] = useState(6);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .profit(horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de utilidad.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [horizon]);

  const avgMargin = data?.meta?.avg_margin_pct as number | undefined;

  return (
    <>
      <PageMeta title="Pronóstico de utilidad y margen" description="Proyección de utilidad bruta y margen" />
      <PageBreadcrumb pageTitle="Utilidad y márgenes" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Proyección de la utilidad bruta mensual (USD) con regresión lineal
        {avgMargin !== undefined ? `. Margen promedio reciente: ${avgMargin}%` : ""}. Cada mes histórico incluye su
        desglose de ingreso, costo, utilidad y margen en "Ver datos".
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType="area"
        advice={{ target: "profit" }}
      />
    </>
  );
}
