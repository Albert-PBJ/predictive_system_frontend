import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import CustomerLocationCard from "../../components/stats/CustomerLocationCard";
import PageMeta from "../../components/common/PageMeta";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import { statsService } from "../../services/statsService";
import { useAsyncData } from "../../hooks/useAsyncData";

export default function Home() {
  const { data, loading, error } = useAsyncData(
    () => statsService.dashboard(),
    "No se pudo cargar el panel de control.",
  );

  const refLabel = data?.reference_month.label ?? "";

  return (
    <>
      <PageMeta title="Inicio" description="Panel de control" />

      {error && <Alert variant="error" title="Error" message={error} />}

      {loading ? (
        <div className="flex h-[70vh] items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando panel…
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-7">
            <EcommerceMetrics kpis={data.kpis} referenceLabel={refLabel} />
            <MonthlySalesChart data={data.monthly_sales} />
          </div>

          <div className="col-span-12 xl:col-span-5">
            <MonthlyTarget kpis={data.kpis} referenceLabel={refLabel} />
          </div>

          <div className="col-span-12">
            <StatisticsChart data={data.monthly_sales} />
          </div>

          <div className="col-span-12 xl:col-span-5">
            <CustomerLocationCard data={data.customers_by_state} subtitle="Top estados por nº de clientes" />
          </div>

          <div className="col-span-12 xl:col-span-7">
            <RecentOrders sales={data.recent_sales} />
          </div>
        </div>
      )}
    </>
  );
}
