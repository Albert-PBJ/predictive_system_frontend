import { BoxIconLine, DollarLineIcon, GroupIcon, ListIcon } from "../../icons";
import StatCard from "../stats/StatCard";
import type { DashboardStats } from "../../services/statsService";
import { fmtCompactUSD, fmtInt } from "../../utils/format";

/**
 * Indicadores principales del panel de Inicio, conectados a la BD vía
 * `/api/analytics/stats/dashboard`. Las variaciones (%) comparan el mes de
 * referencia con el mes anterior.
 */
export default function EcommerceMetrics({ kpis, referenceLabel }: {
  kpis: DashboardStats["kpis"];
  referenceLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <StatCard
        label="Clientes activos"
        value={fmtInt(kpis.customers_active)}
        icon={<GroupIcon className="size-6 text-gray-800 dark:text-white/90" />}
        deltaPct={kpis.customers_active_growth_pct}
        hint={`${fmtInt(kpis.customers_total)} en total`}
      />
      <StatCard
        label={`Ventas (${referenceLabel})`}
        value={fmtInt(kpis.sales_count_month)}
        icon={<BoxIconLine className="size-6 text-gray-800 dark:text-white/90" />}
        deltaPct={kpis.sales_count_growth_pct}
      />
      <StatCard
        label={`Ingresos (${referenceLabel})`}
        value={fmtCompactUSD(kpis.revenue_month)}
        icon={<DollarLineIcon className="size-6 text-gray-800 dark:text-white/90" />}
        deltaPct={kpis.revenue_growth_pct}
      />
      <StatCard
        label="Productos activos"
        value={fmtInt(kpis.products_active)}
        icon={<ListIcon className="size-6 text-gray-800 dark:text-white/90" />}
      />
    </div>
  );
}
