import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";

import ChartCard from "../../components/stats/ChartCard";
import StatCard from "../../components/stats/StatCard";
import RankTable from "../../components/stats/RankTable";
import ModelMetricsCard from "../../components/analytics/ModelMetricsCard";
import PriceCompareChart, { type CompareSeries } from "../../components/benchmarking/PriceCompareChart";

import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import NarrativeBanner from "../../components/dashboard/NarrativeBanner";
import { benchmarkingService, ALL_COMPETITORS } from "../../services/benchmarkingService";
import type { BenchForecast, CategoryForecast, NamedSeries, ProductForecast } from "../../services/benchmarkingService";
import { HORIZON_OPTIONS } from "../../services/analyticsService";
import type { DateRange } from "../../services/statsService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtPct } from "../../utils/format";

const COMPETITOR_COLOR = "#fb6514";
const OWN_COLOR = "#465fff";

function verdictColor(key: string): "success" | "warning" | "error" | "info" {
  switch (key) {
    case "narrowing":
      return "success";
    case "widening":
      return "error";
    case "stable":
      return "info";
    default:
      return "warning";
  }
}

const lastHist = (s?: NamedSeries | null) => (s && s.history.length ? s.history[s.history.length - 1].value : null);
const lastFc = (s?: NamedSeries | null) => (s && s.forecast.length ? s.forecast[s.forecast.length - 1].value : null);
const gapPct = (own: number | null, comp: number | null) => (own != null && comp ? ((own - comp) / comp) * 100 : null);

export default function BenchmarkingForecast() {
  const [range, setRange] = useState<Partial<DateRange>>({});
  const [horizon, setHorizon] = useState(6);
  const [product, setProduct] = useState<number | null>(null);
  const [competitor, setCompetitor] = useState<string>(ALL_COMPETITORS);

  const [forecast, setForecast] = useState<BenchForecast | null>(null);
  const [pf, setPf] = useState<ProductForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [pfLoading, setPfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga de la vista por categoría + lista de productos comparables (selector).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    benchmarkingService
      .forecast(range, horizon)
      .then((d) => {
        if (!active) return;
        setForecast(d);
        setProduct((cur) => {
          const ids = d.matched_products.map((m) => m.product_id);
          return cur && ids.includes(cur) ? cur : ids[0] ?? null;
        });
      })
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el pronóstico de competencia.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, horizon]);

  // Comparación del producto seleccionado (competidor vs. interno).
  useEffect(() => {
    if (!product) {
      setPf(null);
      return;
    }
    let active = true;
    setPfLoading(true);
    benchmarkingService
      .productForecast(range, product, competitor, horizon)
      .then((d) => active && setPf(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar la comparación del producto.")))
      .finally(() => active && setPfLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, horizon, product, competitor]);

  const displayFrom = range.from ?? forecast?.range.from ?? "";
  const displayTo = range.to ?? forecast?.range.to ?? "";

  const productOptions = (forecast?.matched_products || []).map((m) => ({
    value: String(m.product_id),
    label: `${m.name} (${m.n_competitors} compet.)`,
  }));
  const competitorOptions = [
    { value: ALL_COMPETITORS, label: "Todos los competidores (promedio)" },
    ...(pf?.competitors || []).map((c) => ({ value: c, label: c })),
  ];

  const series: CompareSeries[] = [];
  if (pf?.competitor_series) {
    series.push({
      label: pf.competitor_series.label,
      color: COMPETITOR_COLOR,
      history: pf.competitor_series.history,
      forecast: pf.competitor_series.forecast,
    });
  }
  if (pf?.own_series) {
    series.push({
      label: pf.own_series.label,
      color: OWN_COLOR,
      history: pf.own_series.history,
      forecast: pf.own_series.forecast,
    });
  }

  const compCur = lastHist(pf?.competitor_series);
  const compProj = lastFc(pf?.competitor_series);
  const ownCur = lastHist(pf?.own_series);
  const ownProj = lastFc(pf?.own_series);
  const pfInsufficient = pf?.meta?.insufficient_data === true || series.length === 0;

  return (
    <>
      <PageMeta title="Benchmarking · Predicciones" description="Precio del competidor vs. nuestro precio interno por producto" />
      <PageBreadcrumb pageTitle="Predicciones de mercado" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Compara, para un producto con equivalente en la competencia, el <strong>precio del competidor</strong> (uno
        concreto o el promedio de todos) frente a <strong>nuestro precio interno</strong>, con histórico y pronóstico de
        ambas líneas. El rango <strong>Desde / Hasta</strong> define la ventana histórica; el pronóstico la extiende
        según el horizonte.
      </p>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {!forecast ? (
        <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando pronóstico de competencia…
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <DateRangeFilter
            from={displayFrom}
            to={displayTo}
            min={forecast.range.data_from}
            max={forecast.range.data_to}
            onChange={setRange}
            loading={loading || pfLoading}
          />

          {/* Resumen automatizado del periodo */}
          <NarrativeBanner
            sentences={forecast.narrative}
            rangeLabel={`${forecast.range.from_label} – ${forecast.range.to_label}`}
          />

          {forecast.matched_products.length === 0 ? (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              No hay productos con equivalente en la competencia en este período. Ejecuta los scrapers de "Datos externos"
              o <code>rematch_products</code> para asociar la oferta scrapeada al catálogo.
            </div>
          ) : (
            <>
              {/* Selectores */}
              <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
                <div className="w-72">
                  <Label>Producto</Label>
                  <Select
                    key={`prod-${product}`}
                    options={productOptions}
                    defaultValue={product ? String(product) : ""}
                    placeholder="Selecciona un producto"
                    onChange={(v) => {
                      setProduct(Number(v));
                      setCompetitor(ALL_COMPETITORS);
                    }}
                  />
                </div>
                <div className="w-64">
                  <Label>Competidor</Label>
                  <Select
                    key={`comp-${product}-${competitor}`}
                    options={competitorOptions}
                    defaultValue={competitor}
                    onChange={setCompetitor}
                  />
                </div>
                <div className="w-40">
                  <Label>Horizonte</Label>
                  <Select options={HORIZON_OPTIONS} defaultValue={String(horizon)} onChange={(v) => setHorizon(Number(v))} />
                </div>
              </div>

              {/* Comparación del producto */}
              <div className={pfLoading ? "pointer-events-none space-y-4 opacity-60 transition md:space-y-6" : "space-y-4 transition md:space-y-6"}>
                {pfInsufficient ? (
                  <div className="flex h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                    No hay suficientes observaciones de competencia para este producto/competidor en el rango. Prueba con
                    "Todos los competidores" o amplía el período.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <StatCard label="Competidor (actual)" value={fmtUSD(compCur)} />
                      <StatCard label="Competidor (proyectado)" value={fmtUSD(compProj)} hint={`+${horizon} meses`} />
                      <StatCard label="Brecha actual" value={fmtPct(gapPct(ownCur, compCur))} hint="nuestro vs. competidor" />
                      <StatCard label="Brecha proyectada" value={fmtPct(gapPct(ownProj, compProj))} hint="nuestro vs. competidor" />
                    </div>

                    <ChartCard
                      title={pf?.product ? pf.product.name : "Comparación de precio"}
                      subtitle="Precio del competidor vs. nuestro precio interno (histórico sólido · pronóstico discontinuo)"
                    >
                      <PriceCompareChart series={series} />
                    </ChartCard>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                      {pf?.competitor_series && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Modelo · Competidor</p>
                          <ModelMetricsCard model={pf.competitor_series.model} />
                        </div>
                      )}
                      {pf?.own_series && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Modelo · Interno</p>
                          <ModelMetricsCard model={pf.own_series.model} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Brecha de competitividad por categoría (panorama de cartera) */}
              <ChartCard
                title="Brecha de competitividad por categoría"
                subtitle="Diferencia proyectada entre nuestro precio de catálogo y el de mercado (positivo = más caros que el mercado)"
              >
                <RankTable<CategoryForecast>
                  rows={forecast.by_category}
                  empty="Sin categorías con suficientes datos para proyectar."
                  columns={[
                    { key: "category", label: "Categoría", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.category}</span> },
                    { key: "current_market", label: "Mercado actual", align: "right", render: (r) => fmtUSD(r.current_market) },
                    { key: "projected_market", label: "Mercado proyectado", align: "right", render: (r) => fmtUSD(r.projected_market) },
                    { key: "current_own", label: "Nuestro precio", align: "right", render: (r) => (r.current_own != null ? fmtUSD(r.current_own) : "—") },
                    { key: "current_gap_pct", label: "Brecha actual", align: "right", render: (r) => fmtPct(r.current_gap_pct) },
                    { key: "projected_gap_pct", label: "Brecha proy.", align: "right", render: (r) => fmtPct(r.projected_gap_pct) },
                    {
                      key: "verdict",
                      label: "Veredicto",
                      render: (r) => <Badge variant="light" color={verdictColor(r.verdict.key)} size="sm">{r.verdict.label}</Badge>,
                    },
                  ]}
                />
              </ChartCard>
            </>
          )}
        </div>
      )}
    </>
  );
}
