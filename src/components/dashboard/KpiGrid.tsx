import StatCard from "../stats/StatCard";
import type { ExecKpis } from "../../services/statsService";
import { fmtCompactUSD, fmtInt, fmtPct, fmtUSD } from "../../utils/format";
import {
  BoxCubeIcon,
  BoxIcon,
  DollarLineIcon,
  DocsIcon,
  GroupIcon,
  PieChartIcon,
  TaskIcon,
} from "../../icons";

/**
 * Tarjetas de indicadores clave del rango, con variación frente al periodo anterior
 * de igual duración. Utilidad y margen solo aparecen cuando el backend los envía
 * (Gerente/Admin).
 */
export default function KpiGrid({ kpis }: { kpis: ExecKpis }) {
  const sensitive = kpis.profit !== undefined;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      <StatCard
        label="Ingresos"
        value={fmtCompactUSD(kpis.revenue)}
        deltaPct={kpis.revenue_delta_pct}
        icon={<DollarLineIcon className="size-6 text-brand-500" />}
      />
      {sensitive && (
        <StatCard
          label="Utilidad"
          value={fmtCompactUSD(kpis.profit ?? 0)}
          deltaPct={kpis.profit_delta_pct}
          icon={<DollarLineIcon className="size-6 text-success-500" />}
        />
      )}
      {sensitive && (
        <StatCard
          label="Margen"
          value={fmtPct(kpis.margin_pct ?? null, 0)}
          hint={
            kpis.margin_delta_pts !== null && kpis.margin_delta_pts !== undefined
              ? `${kpis.margin_delta_pts >= 0 ? "+" : ""}${kpis.margin_delta_pts} pts vs. periodo previo`
              : undefined
          }
          icon={<PieChartIcon className="size-6 text-purple-500" />}
        />
      )}
      <StatCard
        label="Ventas"
        value={fmtInt(kpis.sales_count)}
        deltaPct={kpis.sales_count_delta_pct}
        icon={<TaskIcon className="size-6 text-brand-500" />}
      />
      <StatCard
        label="Venta promedio"
        value={fmtUSD(kpis.avg_ticket)}
        deltaPct={kpis.avg_ticket_delta_pct}
        hint="Monto promedio por venta"
        icon={<BoxIcon className="size-6 text-amber-500" />}
      />
      <StatCard
        label="Unidades vendidas"
        value={fmtInt(kpis.units_sold)}
        deltaPct={kpis.units_delta_pct}
        icon={<BoxCubeIcon className="size-6 text-cyan-500" />}
      />
      <StatCard
        label="Clientes que compraron"
        value={fmtInt(kpis.active_customers)}
        deltaPct={kpis.active_customers_delta_pct}
        hint={`${fmtInt(kpis.new_customers)} nuevos · ${fmtPct(kpis.retention_pct, 0)} recompra`}
        icon={<GroupIcon className="size-6 text-pink-500" />}
      />
      <StatCard
        label="Conversión presupuestos"
        value={fmtPct(kpis.conversion_rate, 0)}
        hint={`${fmtInt(kpis.quotes_issued)} emitidos en el periodo`}
        icon={<DocsIcon className="size-6 text-blue-light-500" />}
      />
    </div>
  );
}
