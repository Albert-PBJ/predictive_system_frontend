import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import ForecastView from "../../components/analytics/ForecastView";
import {
  analyticsService,
  RATE_OPTIONS,
  type ForecastResponse,
  type RateKey,
} from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

// Descripción de cada tasa para el texto de la página.
const RATE_NOTE: Record<RateKey, string> = {
  bcv: "Dólar BCV (oficial, Bs/USD)",
  eur: "Euro BCV (oficial, Bs/EUR)",
  parallel: "dólar paralelo (referencial, Bs/USD)",
};

export default function ExchangeRateForecast() {
  const [rate, setRate] = useState<RateKey>("bcv");
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
      <PageMeta
        title="Pronóstico de la tasa de cambio"
        description="Proyección del Dólar BCV, el Euro BCV y el paralelo"
      />
      <PageBreadcrumb pageTitle="Tasa de cambio" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Proyección de la tasa <strong>{RATE_NOTE[rate]}</strong> con regresión lineal sobre el logaritmo de la tasa,
        que captura la devaluación exponencial del bolívar. Las dos oficiales del BCV son las operativas (con las que
        se factura); el paralelo se sigue como referencia del valor real del dinero. Activa la escala logarítmica para
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
        advice={{ target: "exchange-rate", rate }}
        extraControls={
          <>
            <div className="w-52">
              <Label>Tasa</Label>
              <Select options={RATE_OPTIONS} defaultValue={rate} onChange={(v) => setRate(v as RateKey)} />
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
