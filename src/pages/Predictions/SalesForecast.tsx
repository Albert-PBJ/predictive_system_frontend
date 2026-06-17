import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import ForecastView from "../../components/analytics/ForecastView";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

const METRICS = [
  { value: "revenue", label: "Ingresos (USD)" },
  { value: "count", label: "Número de ventas" },
];

export default function SalesForecast() {
  const [metric, setMetric] = useState<"revenue" | "count">("revenue");
  const [horizon, setHorizon] = useState(6);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .sales(metric, horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de ventas.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [metric, horizon]);

  return (
    <>
      <PageMeta title="Pronóstico de ventas e ingresos" description="Proyección de ingresos y número de ventas" />
      <PageBreadcrumb pageTitle="Ventas e ingresos" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Proyección mensual de {metric === "revenue" ? "ingresos en USD" : "número de ventas"} con regresión lineal
        (calendario, estacionalidad, rezagos y shock cambiario). La banda muestra el intervalo de confianza ~90%.
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType={metric === "count" ? "bar" : "area"}
        advice={{ target: "sales", metric }}
        extraControls={
          <div className="w-52">
            <Label>Métrica</Label>
            <Select options={METRICS} defaultValue={metric} onChange={(v) => setMetric(v as "revenue" | "count")} />
          </div>
        }
      />
    </>
  );
}
