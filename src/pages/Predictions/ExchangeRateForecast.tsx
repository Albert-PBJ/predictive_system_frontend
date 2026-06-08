import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import ForecastView from "../../components/analytics/ForecastView";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

const RATES = [
  { value: "bcv", label: "Tasa BCV (oficial)" },
  { value: "parallel", label: "Tasa paralela" },
];

export default function ExchangeRateForecast() {
  const [rate, setRate] = useState<"bcv" | "parallel">("bcv");
  const [horizon, setHorizon] = useState(6);
  const [logScale, setLogScale] = useState(false);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .exchangeRate(rate, horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de la tasa de cambio.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [rate, horizon]);

  return (
    <>
      <PageMeta title="Pronóstico de la tasa de cambio" description="Proyección de la tasa BCV y paralela" />
      <PageBreadcrumb pageTitle="Tasa de cambio (BCV)" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Proyección de la tasa {rate === "bcv" ? "BCV oficial" : "paralela"} (Bs/USD) con regresión lineal sobre el
        logaritmo de la tasa, que captura la devaluación exponencial del bolívar. Activa la escala logarítmica para
        ver mejor la tendencia.
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType="area"
        logScale={logScale}
        extraControls={
          <>
            <div className="w-52">
              <Label>Tasa</Label>
              <Select options={RATES} defaultValue={rate} onChange={(v) => setRate(v as "bcv" | "parallel")} />
            </div>
            <div className="flex h-11 items-center">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={logScale}
                  onChange={(e) => setLogScale(e.target.checked)}
                  className="size-4 rounded border-gray-300"
                />
                Escala logarítmica
              </label>
            </div>
          </>
        }
      />
    </>
  );
}
