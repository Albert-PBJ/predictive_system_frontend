import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ForecastView from "../../components/analytics/ForecastView";
import ProductSelect from "../../components/analytics/ProductSelect";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";
import { fmtVES } from "../../utils/format";

export default function ProductPriceForecast() {
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
      .productPrice(product, horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de precio.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [product, horizon]);

  // El precio en USD es estable; el equivalente en Bs sube con la tasa pronosticada.
  const vesNote = useMemo(() => {
    const last = data?.forecast?.[data.forecast.length - 1];
    if (!last || last.value_ves == null) return null;
    return (
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Equivalente estimado en {last.label}: <strong>{fmtVES(last.value_ves)}</strong> (precio USD × tasa paralela
        pronosticada).
      </p>
    );
  }, [data]);

  return (
    <>
      <PageMeta title="Pronóstico de precio de producto" description="Proyección del precio de venta por producto" />
      <PageBreadcrumb pageTitle="Precios de productos" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Precio de venta (USD) pronosticado con regresión lineal sobre el historial de precios.
        {data?.subject ? ` Producto: ${data.subject.product_name}.` : ""} El precio en USD es relativamente estable;
        su equivalente en bolívares se deriva con la tasa pronosticada.
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType="area"
        advice={{ target: "product-price", product: product ?? undefined }}
        extraControls={<ProductSelect value={product} onChange={(id) => setProduct(id)} />}
        belowChart={vesNote}
        emptyHint="Este producto no tiene suficiente historial de precios para pronosticar."
      />
    </>
  );
}
