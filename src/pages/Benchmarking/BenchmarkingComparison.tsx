import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";

import ChartCard from "../../components/stats/ChartCard";
import StatCard from "../../components/stats/StatCard";
import BarChart from "../../components/stats/BarChart";
import DonutChart from "../../components/stats/DonutChart";
import RankTable from "../../components/stats/RankTable";

import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import NarrativeBanner from "../../components/dashboard/NarrativeBanner";
import { positionMeta } from "../../components/analytics/format";
import { benchmarkingService } from "../../services/benchmarkingService";
import type {
  BenchComparison,
  CompetitorRow,
  PriceComparisonRow,
  UnmatchedProductRow,
} from "../../services/benchmarkingService";
import type { DateRange } from "../../services/statsService";
import { getApiError } from "../../services/apiError";
import { fmtInt, fmtUSD, fmtDate } from "../../utils/format";

export default function BenchmarkingComparison() {
  const [range, setRange] = useState<Partial<DateRange>>({});
  const [data, setData] = useState<BenchComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    benchmarkingService
      .comparison(range)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar la comparación de competencia.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const displayFrom = range.from ?? data?.range.from ?? "";
  const displayTo = range.to ?? data?.range.to ?? "";

  return (
    <>
      <PageMeta title="Benchmarking · Comparaciones" description="Inteligencia competitiva descriptiva de Inversiones Maescar C.A." />
      <PageBreadcrumb pageTitle="Comparaciones competitivas" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Radiografía de la competencia construida con los datos scrapeados y el catálogo interno. Usa los selectores
        <strong> Desde / Hasta</strong> para recalcular todo el panel sobre las observaciones de mercado de ese período.
      </p>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {!data ? (
        <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando comparación competitiva…
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <DateRangeFilter
            from={displayFrom}
            to={displayTo}
            min={data.range.data_from}
            max={data.range.data_to}
            onChange={setRange}
            loading={loading}
          />

          {data.meta.n_obs === 0 ? (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              No hay observaciones de competencia con precio en este período. Ejecuta los scrapers de "Datos externos" o
              amplía el rango.
            </div>
          ) : (
            <div className={loading ? "pointer-events-none space-y-4 opacity-60 transition md:space-y-6" : "space-y-4 transition md:space-y-6"}>
              {/* Resumen automatizado del periodo */}
              <NarrativeBanner
                sentences={data.narrative}
                rangeLabel={`${data.range.from_label} – ${data.range.to_label}`}
              />

              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Competidores" value={fmtInt(data.meta.n_competitors)} hint={`${fmtInt(data.range.months)} mes(es)`} />
                <StatCard label="Observaciones" value={fmtInt(data.meta.n_obs)} />
                <StatCard label="Productos distintos" value={fmtInt(data.meta.n_products)} />
                <StatCard label="Con promoción" value={fmtInt(data.meta.n_with_promo)} hint={`${data.promotions.share_obs_pct}% de las obs.`} />
                <StatCard label="Fuera de catálogo" value={fmtInt(data.meta.n_unmatched)} hint="sin equivalente propio" />
              </div>

              {/* Ubicación + plataforma */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <ChartCard title="Competidores por ubicación" subtitle="Estados donde operan los competidores observados">
                    <BarChart
                      categories={data.by_state.map((s) => s.state)}
                      series={[{ name: "Competidores", data: data.by_state.map((s) => s.competitors) }]}
                      horizontal
                      distributed
                      valueFormatter={fmtInt}
                    />
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <ChartCard title="Reparto por plataforma" subtitle="% de observaciones por fuente de scraping">
                    <DonutChart
                      labels={data.by_source.map((s) => s.label)}
                      series={data.by_source.map((s) => s.observations)}
                      valueFormatter={fmtInt}
                      totalLabel="Obs."
                    />
                  </ChartCard>
                </div>
              </div>

              {/* Promociones */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <ChartCard
                    title="Promociones detectadas"
                    subtitle={`${data.promotions.competitors_with_promo.length} de ${data.promotions.total_competitors} competidores ofrecen alguna promoción`}
                  >
                    {data.promotions.breakdown.length ? (
                      <BarChart
                        categories={data.promotions.breakdown.map((p) => p.promotion)}
                        series={[{ name: "Observaciones", data: data.promotions.breakdown.map((p) => p.count) }]}
                        horizontal
                        distributed
                        valueFormatter={fmtInt}
                      />
                    ) : (
                      <p className="py-8 text-center text-sm text-gray-400">No se detectaron promociones en el período.</p>
                    )}
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <ChartCard title="Quién promociona" subtitle="Promociones activas por competidor">
                    <div className="max-h-[320px] space-y-2 overflow-auto custom-scrollbar">
                      {data.promotions.competitors_with_promo.length ? (
                        data.promotions.competitors_with_promo.map((c) => (
                          <div key={c.competitor} className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{c.competitor}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {c.promotions.map((p) => (
                                <Badge key={p} variant="light" color="info" size="sm">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-sm text-gray-400">Sin promociones.</p>
                      )}
                    </div>
                  </ChartCard>
                </div>
              </div>

              {/* Variedad de catálogo por competidor */}
              <ChartCard title="Variedad de catálogo por competidor" subtitle="Amplitud de surtido, plataformas y precio promedio">
                <RankTable<CompetitorRow>
                  rows={data.by_competitor}
                  columns={[
                    { key: "competitor", label: "Competidor", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.competitor}</span> },
                    { key: "state", label: "Ubicación", render: (r) => r.state },
                    { key: "sources", label: "Plataformas", render: (r) => r.sources.join(", ") },
                    { key: "products", label: "Productos", align: "right", render: (r) => fmtInt(r.products) },
                    { key: "categories", label: "Categorías", align: "right", render: (r) => fmtInt(r.categories) },
                    { key: "observations", label: "Obs.", align: "right", render: (r) => fmtInt(r.observations) },
                    { key: "avg_price_usd", label: "Precio prom.", align: "right", render: (r) => fmtUSD(r.avg_price_usd) },
                    {
                      key: "has_promo",
                      label: "Promo",
                      render: (r) => (r.has_promo ? <Badge variant="light" color="success" size="sm">Sí</Badge> : <span className="text-gray-400">—</span>),
                    },
                  ]}
                />
              </ChartCard>

              {/* Productos fuera de nuestro catálogo */}
              <ChartCard
                title="Productos fuera de nuestro catálogo"
                subtitle={`${fmtInt(data.products_not_in_catalog.length)} producto(s) de la competencia sin equivalente en el catálogo activo de Maescar`}
              >
                {data.categories_not_covered.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Categorías no cubiertas:</span>
                    {data.categories_not_covered.map((c) => (
                      <Badge key={c} variant="light" color="warning" size="sm">{c}</Badge>
                    ))}
                  </div>
                )}
                <div className="max-h-[420px] overflow-auto custom-scrollbar">
                  <RankTable<UnmatchedProductRow>
                    rows={data.products_not_in_catalog}
                    empty="Toda la oferta de la competencia tiene equivalente en nuestro catálogo. 🎉"
                    columns={[
                      { key: "product_name", label: "Producto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.product_name}</span> },
                      { key: "category", label: "Categoría", render: (r) => r.category },
                      { key: "competitor", label: "Competidor", render: (r) => r.competitor },
                      { key: "source_label", label: "Fuente", render: (r) => r.source_label },
                      { key: "price_usd", label: "Precio", align: "right", render: (r) => fmtUSD(r.price_usd) },
                    ]}
                  />
                </div>
              </ChartCard>

              {/* Posicionamiento por categoría */}
              <ChartCard title="Posicionamiento por categoría" subtitle="Nuestro precio de catálogo vs. el rango de mercado">
                <BarChart
                  categories={data.positioning.map((p) => p.category)}
                  series={[
                    { name: "Mín mercado", data: data.positioning.map((p) => p.comp_min), color: "#93c5fd" },
                    { name: "Prom mercado", data: data.positioning.map((p) => p.comp_avg), color: "#465fff" },
                    { name: "Máx mercado", data: data.positioning.map((p) => p.comp_max), color: "#1e3a8a" },
                    { name: "Nuestro precio", data: data.positioning.map((p) => p.own_avg) as unknown as number[], color: "#fb6514" },
                  ]}
                  valueFormatter={fmtUSD}
                  showLegend
                  height={340}
                />
              </ChartCard>

              {/* Comparación like-with-like */}
              <ChartCard
                title="Comparación por producto"
                subtitle="Match like-with-like contra el catálogo: nuestro precio vs. el de la competencia"
              >
                <div className="max-h-[460px] overflow-auto custom-scrollbar">
                  <RankTable<PriceComparisonRow>
                    rows={data.price_comparison}
                    empty="Sin productos matcheados en el período. Ejecuta 'rematch_products' para asociar la oferta scrapeada al catálogo."
                    columns={[
                      { key: "product", label: "Producto", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.product}</span> },
                      { key: "own_price_usd", label: "Nuestro precio", align: "right", render: (r) => (r.own_price_usd != null ? fmtUSD(r.own_price_usd) : "—") },
                      { key: "comp_min", label: "Mín mercado", align: "right", render: (r) => fmtUSD(r.comp_min) },
                      { key: "comp_avg", label: "Prom mercado", align: "right", render: (r) => fmtUSD(r.comp_avg) },
                      { key: "comp_max", label: "Máx mercado", align: "right", render: (r) => fmtUSD(r.comp_max) },
                      { key: "n_competitors", label: "Compet.", align: "right", render: (r) => fmtInt(r.n_competitors) },
                      {
                        key: "position",
                        label: "Posición",
                        render: (r) => {
                          const pm = positionMeta(r.position);
                          return <Badge variant="light" color={pm.color} size="sm">{pm.label}</Badge>;
                        },
                      },
                    ]}
                  />
                </div>
              </ChartCard>

              {/* Observaciones */}
              <ChartCard title="Observaciones de mercado" subtitle="Detalle de las observaciones del período (máx. 250)">
                <div className="max-h-[480px] overflow-auto custom-scrollbar">
                  <RankTable<BenchComparison["observations"][number]>
                    rows={data.observations}
                    columns={[
                      { key: "competitor", label: "Competidor", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{r.competitor}</span> },
                      { key: "product_name", label: "Producto", render: (r) => r.product_name },
                      { key: "category", label: "Categoría", render: (r) => r.category },
                      { key: "source_label", label: "Fuente", render: (r) => r.source_label },
                      { key: "price_usd", label: "Precio", align: "right", render: (r) => fmtUSD(r.price_usd) },
                      { key: "promotions", label: "Promoción", render: (r) => r.promotions || "—" },
                      {
                        key: "in_stock",
                        label: "Stock",
                        render: (r) =>
                          r.in_stock == null ? (
                            <span className="text-gray-400">—</span>
                          ) : r.in_stock ? (
                            <Badge variant="light" color="success" size="sm">Sí</Badge>
                          ) : (
                            <Badge variant="light" color="error" size="sm">No</Badge>
                          ),
                      },
                      { key: "scraped_at", label: "Fecha", render: (r) => fmtDate(r.scraped_at) },
                    ]}
                  />
                </div>
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </>
  );
}
