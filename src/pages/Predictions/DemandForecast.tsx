import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ForecastView from "../../components/analytics/ForecastView";
import ProductSelect from "../../components/analytics/ProductSelect";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

export default function DemandForecast() {
  const [product, setProduct] = useState<number | null>(null);
  const [horizon, setHorizon] = useState(6);
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .demand(product, horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de demanda.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [product, horizon]);

  return (
    <>
      <PageMeta title="Pronóstico de demanda" description="Demanda mensual por producto" />
      <PageBreadcrumb pageTitle="Demanda por producto" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Unidades mensuales pronosticadas con un modelo panel <strong>XGBoost</strong> (un solo modelo que aprende de
        todos los productos: calendario, estacionalidad, rezagos, categoría, precio base y shock cambiario).
        {data?.subject ? ` Producto: ${data.subject.product_name}.` : ""}
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType="area"
        advice={{ target: "demand", product: product ?? undefined }}
        extraControls={<ProductSelect value={product} onChange={(id) => setProduct(id)} />}
        emptyHint="Este producto no tiene suficiente historial de ventas para pronosticar su demanda."
      />
    </>
  );
}
