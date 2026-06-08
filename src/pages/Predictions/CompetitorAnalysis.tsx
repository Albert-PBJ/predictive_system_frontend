import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import Select from "../../components/form/Select";
import Label from "../../components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useTheme } from "../../context/ThemeContext";
import { analyticsService, type CompetitorResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtDate } from "../../utils/format";
import { positionMeta } from "../../components/analytics/format";

export default function CompetitorAnalysis() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [category, setCategory] = useState<string>("");
  const [data, setData] = useState<CompetitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .competitors(category || undefined)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el análisis de competencia.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category]);

  const posOptions: ApexOptions = {
    chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
    colors: ["#93c5fd", "#465fff", "#1e3a8a", "#fb6514"],
    plotOptions: { bar: { columnWidth: "70%", borderRadius: 3 } },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left", labels: { colors: dark ? "#98a2b3" : "#475467" } },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories: (data?.positioning || []).map((p) => p.category),
      labels: { style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (v) => fmtUSD(v), style: { colors: dark ? "#98a2b3" : "#667085" } } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v) => (v == null ? "—" : fmtUSD(v)) } },
  };

  const posSeries = useMemo(() => {
    const p = data?.positioning || [];
    return [
      { name: "Mín mercado", data: p.map((x) => x.comp_min) },
      { name: "Prom mercado", data: p.map((x) => x.comp_avg) },
      { name: "Máx mercado", data: p.map((x) => x.comp_max) },
      { name: "Nuestro precio", data: p.map((x) => x.own_avg) },
    ];
  }, [data]);

  const trendOptions: ApexOptions = {
    chart: { type: "line", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
    colors: ["#465fff", "#fb6514"],
    stroke: { curve: "smooth", width: [3, 2], dashArray: [0, 5] },
    dataLabels: { enabled: false },
    legend: { position: "top", horizontalAlign: "left", labels: { colors: dark ? "#98a2b3" : "#475467" } },
    grid: { borderColor: dark ? "#1d2939" : "#f2f4f7", strokeDashArray: 4 },
    xaxis: {
      categories: (data?.trend || []).map((t) => t.label),
      labels: { style: { colors: dark ? "#98a2b3" : "#667085", fontSize: "11px" } },
    },
    yaxis: { labels: { formatter: (v) => fmtUSD(v), style: { colors: dark ? "#98a2b3" : "#667085" } } },
    tooltip: { theme: dark ? "dark" : "light", y: { formatter: (v) => fmtUSD(v) } },
  };

  const categoryOptions = [{ value: "", label: "Todas las categorías" }, ...(data?.categories || []).map((c) => ({ value: c, label: c }))];

  return (
    <>
      <PageMeta title="Análisis de competencia" description="Precios de competidores vs. precios propios" />
      <PageBreadcrumb pageTitle="Mercado y competencia" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Análisis de los precios de la competencia (datos de scraping), <strong>independiente</strong> de los datos
        internos. Compara nuestros precios con el rango de mercado por categoría y producto, e identifica tendencia y
        posicionamiento.
      </p>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Label>Categoría</Label>
          <Select options={categoryOptions} defaultValue={category} placeholder="Todas las categorías" onChange={setCategory} />
        </div>
        {data && (
          <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Badge variant="light" color="info" size="sm">{data.meta.n_obs} observaciones</Badge>
            {data.meta.n_competitors ? <Badge variant="light" color="info" size="sm">{data.meta.n_competitors} competidores</Badge> : null}
          </div>
        )}
      </div>

      {error && <Alert variant="error" title="Error" message={error} />}

      {loading ? (
        <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando…
        </div>
      ) : !data || data.meta.n_obs === 0 ? (
        <div className="flex h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          No hay datos de competencia con precio para esta selección. Ejecuta los scrapers de "Datos externos".
        </div>
      ) : (
        <>
          {/* Posicionamiento por categoría */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Nuestro precio vs. rango de mercado por categoría</h4>
            <div className="max-w-full overflow-x-auto custom-scrollbar">
              <div className="min-w-[560px]">
                <Chart options={posOptions} series={posSeries} type="bar" height={320} />
              </div>
            </div>
          </div>

          {/* Comparación por producto (match like-with-like) */}
          {data.product_comparison.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">Comparación por producto (match con el catálogo)</h4>
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Producto", "Nuestro precio", "Mín mercado", "Prom mercado", "Máx mercado", "Obs.", "Posición"].map((h) => (
                        <TableCell key={h} isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.product_comparison.map((p) => {
                      const pm = positionMeta(p.position);
                      return (
                        <TableRow key={p.product_id}>
                          <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{p.product}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200">{p.own_price_usd != null ? fmtUSD(p.own_price_usd) : "—"}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(p.comp_min)}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(p.comp_avg)}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtUSD(p.comp_max)}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{p.n_obs}</TableCell>
                          <TableCell className="px-3 py-2.5"><Badge variant="light" color={pm.color} size="sm">{pm.label}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Tendencia de precios de mercado */}
          {data.trend.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Tendencia del precio promedio de mercado
                {data.model?.slope_usd_per_month != null ? ` (${data.model.slope_usd_per_month > 0 ? "+" : ""}${data.model.slope_usd_per_month} USD/mes)` : ""}
              </h4>
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <div className="min-w-[560px]">
                  <Chart
                    options={trendOptions}
                    series={[
                      { name: "Prom mercado", data: data.trend.map((t) => t.comp_avg) },
                      { name: "Tendencia", data: data.trend.map((t) => t.trend) },
                    ]}
                    type="line"
                    height={260}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Observaciones + por competidor */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">Observaciones de mercado</h4>
              <div className="max-h-[400px] max-w-full overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="sticky top-0 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <TableRow>
                      {["Competidor", "Producto", "Categoría", "Precio", "Fecha"].map((h) => (
                        <TableCell key={h} isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.observations.slice(0, 100).map((o, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{o.competitor}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{o.product_name || "—"}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{o.category}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200">{fmtUSD(o.price_usd)}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtDate(o.scraped_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">Por competidor</h4>
              <div className="max-h-[400px] space-y-2 overflow-auto custom-scrollbar">
                {data.by_competitor.map((c) => (
                  <div key={c.competitor} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white/90">{c.competitor}</p>
                      <p className="text-xs text-gray-400">{c.products} producto(s) · {c.n_obs} obs.</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmtUSD(c.avg_price_usd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
