import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import { statsService } from "../../services/statsService";
import type {
  DateRange,
  ExecutiveDashboard,
  InventoryHealth,
  NoDemandRow,
  ExecProductRow,
  ExecCustomerRow,
} from "../../services/statsService";
import { getApiError } from "../../services/apiError";
import { fmtCompactUSD, fmtInt, fmtUSD } from "../../utils/format";

import ChartCard from "../../components/stats/ChartCard";
import BarChart from "../../components/stats/BarChart";
import LineChart from "../../components/stats/LineChart";
import DonutChart from "../../components/stats/DonutChart";
import RankTable from "../../components/stats/RankTable";
import CustomerLocationCard from "../../components/stats/CustomerLocationCard";
import RecentOrders from "../../components/ecommerce/RecentOrders";

import DateRangeFilter from "../../components/dashboard/DateRangeFilter";
import NarrativeBanner from "../../components/dashboard/NarrativeBanner";
import KpiGrid from "../../components/dashboard/KpiGrid";
import HealthGauge from "../../components/dashboard/HealthGauge";
import AlertsPanel from "../../components/dashboard/AlertsPanel";
import ExchangeRateCard from "../../components/dashboard/ExchangeRateCard";
import CompetitivePanel from "../../components/dashboard/CompetitivePanel";

/** Tarjeta compacta de salud de inventario (instantánea actual). */
function InventoryCard({ inv }: { inv: InventoryHealth }) {
  const pill = (label: string, n: number, cls: string) => (
    <div className={`rounded-lg p-2.5 text-center ${cls}`}>
      <p className="text-lg font-bold">{fmtInt(n)}</p>
      <p className="text-[11px] font-medium">{label}</p>
    </div>
  );
  return (
    <ChartCard title="Salud del inventario" subtitle="Estado actual del stock (no depende del rango)">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Unidades en stock</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">{fmtInt(inv.units_in_stock)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <p className="text-xs text-gray-500 dark:text-gray-400">Valor (a precio venta)</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white/90">{fmtCompactUSD(inv.inventory_retail_usd)}</p>
          {inv.inventory_cost_usd !== undefined && (
            <p className="text-[11px] text-gray-400">Costo: {fmtCompactUSD(inv.inventory_cost_usd)}</p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {pill("Con stock", inv.ok_stock, "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500")}
        {pill("Stock bajo", inv.low_stock, "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-orange-400")}
        {pill("Sin stock", inv.out_of_stock, "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500")}
      </div>
    </ChartCard>
  );
}

export default function Home() {
  const [range, setRange] = useState<Partial<DateRange>>({});
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    statsService
      .dashboard(range)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el panel de control.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // Recarga cuando cambian las fechas del rango; `range` se desestructura a propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const displayFrom = range.from ?? data?.range.from ?? "";
  const displayTo = range.to ?? data?.range.to ?? "";

  return (
    <>
      <PageMeta title="Inicio" description="Panel de control ejecutivo de Inversiones Maescar C.A." />

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {!data ? (
        <div className="flex h-[70vh] items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando panel ejecutivo…
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {/* Máquina del tiempo: dos selectores Desde/Hasta que recalculan todo el panel. */}
          <DateRangeFilter
            from={displayFrom}
            to={displayTo}
            min={data.range.data_from}
            max={data.range.data_to}
            onChange={setRange}
            loading={loading}
          />

          <div className={loading ? "pointer-events-none opacity-60 transition" : "transition"}>
            <div className="space-y-4 md:space-y-6">
              <NarrativeBanner
                sentences={data.narrative}
                rangeLabel={`${data.range.from_label} – ${data.range.to_label}`}
              />

              {/* IVC (North Star) + KPIs */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                {data.health_index && (
                  <div className="col-span-12 xl:col-span-4">
                    <HealthGauge data={data.health_index} />
                  </div>
                )}
                <div className={data.health_index ? "col-span-12 xl:col-span-8" : "col-span-12"}>
                  <KpiGrid kpis={data.kpis} />
                </div>
              </div>

              {/* Tendencia de ingresos/utilidad + composición */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <ChartCard title="Ingresos y utilidad" subtitle="Evolución mensual dentro del rango">
                    <BarChart
                      categories={data.monthly.map((m) => m.label)}
                      series={[
                        { name: "Ingresos", data: data.monthly.map((m) => Math.round(m.revenue)), color: "#465fff" },
                        ...(data.kpis.profit !== undefined
                          ? [{ name: "Utilidad", data: data.monthly.map((m) => Math.round(m.profit ?? 0)), color: "#12b76a" }]
                          : []),
                      ]}
                      valueFormatter={fmtCompactUSD}
                      showLegend
                    />
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <ChartCard title="Composición de ingresos" subtitle="Detal vs. institucional (rango)">
                    <DonutChart
                      labels={data.type_split.map((t) => t.label)}
                      series={data.type_split.map((t) => Math.round(t.revenue))}
                      valueFormatter={fmtCompactUSD}
                      totalLabel="Ingresos"
                    />
                  </ChartCard>
                </div>
              </div>

              {/* Historia estratégica (divergencia detal/institucional) + categorías */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <ChartCard
                    title="Detal vs. institucional"
                    subtitle="Tendencia mensual de ingresos por segmento"
                  >
                    <LineChart
                      categories={data.monthly_by_type.map((m) => m.label)}
                      series={[
                        { name: "Detal", data: data.monthly_by_type.map((m) => Math.round(m.retail)), color: "#f79009" },
                        {
                          name: "Institucional",
                          data: data.monthly_by_type.map((m) => Math.round(m.institutional)),
                          color: "#465fff",
                        },
                      ]}
                      type="area"
                      valueFormatter={fmtCompactUSD}
                      showLegend
                    />
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <ChartCard title="Ingresos por categoría" subtitle="Categorías más vendidas (rango)">
                    <BarChart
                      categories={data.revenue_by_category.map((c) => c.category)}
                      series={[{ name: "Ingresos", data: data.revenue_by_category.map((c) => Math.round(c.revenue)) }]}
                      horizontal
                      distributed
                      valueFormatter={fmtCompactUSD}
                    />
                  </ChartCard>
                </div>
              </div>

              {/* Productos sin demanda + alertas tempranas */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-7">
                  <ChartCard
                    title="Productos sin demanda"
                    subtitle={`${data.no_demand_count} producto(s) activos sin ventas en el rango — capital inmovilizado`}
                  >
                    <RankTable<NoDemandRow>
                      rows={data.no_demand}
                      empty="Todos los productos activos registraron ventas en el rango. 🎉"
                      columns={[
                        { key: "name", label: "Producto", render: (r) => <span className="font-medium">{r.name}</span> },
                        { key: "category", label: "Categoría" },
                        { key: "stock", label: "Stock", align: "right", render: (r) => fmtInt(r.stock) },
                        {
                          key: "retail_value",
                          label: "Valor detenido",
                          align: "right",
                          render: (r) => fmtUSD(r.retail_value),
                        },
                      ]}
                    />
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-5">
                  <AlertsPanel
                    alerts={data.alerts}
                    atRisk={data.at_risk}
                    noDemand={data.no_demand}
                    noDemandCount={data.no_demand_count}
                  />
                </div>
              </div>

              {/* Top productos + top clientes */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-6">
                  <ChartCard title="Productos más vendidos" subtitle="Por ingresos en el rango">
                    <RankTable<ExecProductRow>
                      ranked
                      rows={data.top_products}
                      columns={[
                        { key: "name", label: "Producto", render: (r) => <span className="font-medium">{r.name}</span> },
                        { key: "units", label: "Uds.", align: "right", render: (r) => fmtInt(r.units) },
                        { key: "revenue", label: "Ingresos", align: "right", render: (r) => fmtUSD(r.revenue) },
                      ]}
                    />
                  </ChartCard>
                </div>
                <div className="col-span-12 xl:col-span-6">
                  <ChartCard title="Mejores clientes" subtitle="Por ingresos en el rango">
                    <RankTable<ExecCustomerRow>
                      ranked
                      rows={data.top_customers}
                      columns={[
                        { key: "name", label: "Cliente", render: (r) => <span className="font-medium">{r.name}</span> },
                        { key: "orders", label: "Pedidos", align: "right", render: (r) => fmtInt(r.orders) },
                        { key: "revenue", label: "Ingresos", align: "right", render: (r) => fmtUSD(r.revenue) },
                      ]}
                    />
                  </ChartCard>
                </div>
              </div>

              {/* Inventario (snapshot) + contexto cambiario */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                <div className="col-span-12 xl:col-span-5">
                  <InventoryCard inv={data.inventory_health} />
                </div>
                <div className="col-span-12 xl:col-span-7">
                  <ExchangeRateCard data={data.exchange_rate} />
                </div>
              </div>

              {/* Posición competitiva (sensible) + distribución de clientes */}
              <div className="grid grid-cols-12 gap-4 md:gap-6">
                {data.competitive && (
                  <div className="col-span-12 xl:col-span-6">
                    <CompetitivePanel data={data.competitive} />
                  </div>
                )}
                <div className={data.competitive ? "col-span-12 xl:col-span-6" : "col-span-12 xl:col-span-6"}>
                  <CustomerLocationCard data={data.customers_by_state} subtitle="Top estados por nº de clientes" />
                </div>
              </div>

              {/* Salud de modelos (sensible) */}
              {/* data.model_health && data.model_health.length > 0 && (
                <ModelHealthStrip rows={data.model_health} />
              ) */}

              {/* Ventas recientes del rango */}
              <RecentOrders sales={data.recent_sales} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
