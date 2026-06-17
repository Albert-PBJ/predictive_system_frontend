import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import ForecastView from "../../components/analytics/ForecastView";
import ProductSelect from "../../components/analytics/ProductSelect";
import { analyticsService, type ForecastResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

interface InvMeta {
  current_stock: number;
  min_stock: number;
  avg_monthly_demand: number;
  months_of_cover: number | null;
  reorder_point: number;
  suggested_reorder_qty: number;
  stockout_label: string | null;
  lead_time_days: number;
  needs_reorder: boolean;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        tone === "warn"
          ? "border-warning-300 bg-warning-50 dark:border-warning-500/40 dark:bg-warning-500/10"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]"
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
    </div>
  );
}

export default function InventoryForecast() {
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
      .inventory(product, horizon)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar la proyección de inventario.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [product, horizon]);

  const meta = data?.meta as unknown as InvMeta | undefined;

  const annotations = useMemo(() => {
    if (!meta) return [];
    const a = [{ y: meta.reorder_point, label: `Punto de reorden (${meta.reorder_point})`, color: "#f79009" }];
    if (meta.min_stock > 0) a.push({ y: meta.min_stock, label: `Stock mínimo (${meta.min_stock})`, color: "#f04438" });
    return a;
  }, [meta]);

  const recommendation = meta && data && !data.meta.insufficient_data ? (
    <div className="mt-5">
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Stock actual" value={String(meta.current_stock)} />
        <Stat label="Demanda mensual prom." value={String(meta.avg_monthly_demand)} />
        <Stat
          label="Meses de cobertura"
          value={meta.months_of_cover != null ? `${meta.months_of_cover}` : "—"}
          tone={meta.months_of_cover != null && meta.months_of_cover < 2 ? "warn" : undefined}
        />
        <Stat
          label="Agotamiento estimado"
          value={meta.stockout_label || "Sin riesgo"}
          tone={meta.stockout_label ? "warn" : undefined}
        />
      </div>
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
          meta.needs_reorder
            ? "border-warning-300 bg-warning-50 dark:border-warning-500/40 dark:bg-warning-500/10"
            : "border-success-300 bg-success-50 dark:border-success-500/40 dark:bg-success-500/10"
        }`}
      >
        <div className="flex items-center gap-3">
          <Badge variant="light" color={meta.needs_reorder ? "warning" : "success"} size="sm">
            {meta.needs_reorder ? "Reabastecer" : "Stock suficiente"}
          </Badge>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {meta.needs_reorder
              ? `Cantidad sugerida de reposición: ${meta.suggested_reorder_qty} unidades (lead time ${meta.lead_time_days} días, punto de reorden ${meta.reorder_point}).`
              : `El stock cubre la demanda pronosticada del horizonte. Punto de reorden: ${meta.reorder_point}.`}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <PageMeta title="Proyección de inventario" description="Reabastecimiento y agotamiento por producto" />
      <PageBreadcrumb pageTitle="Inventario y reabastecimiento" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Stock proyectado mes a mes (barras) restando la demanda pronosticada del modelo de demanda. Las líneas marcan
        el punto de reorden y el stock mínimo. Incluye la cantidad de reposición recomendada.
        {data?.subject ? ` Producto: ${data.subject.product_name}.` : ""}
      </p>

      <ForecastView
        data={data}
        loading={loading}
        error={error}
        horizon={horizon}
        onHorizon={setHorizon}
        chartType="bar"
        showBand={false}
        advice={{ target: "inventory", product: product ?? undefined }}
        extraControls={<ProductSelect value={product} onChange={(id) => setProduct(id)} />}
        yAnnotations={annotations}
        belowChart={recommendation}
        emptyHint="Este producto no tiene suficiente historial para proyectar su inventario."
      />
    </>
  );
}
