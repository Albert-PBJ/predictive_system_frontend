import ChartCard from "../stats/ChartCard";
import type { DashboardAlert, ExecCustomerRow, NoDemandRow } from "../../services/statsService";
import { AlertHexaIcon, CheckCircleIcon } from "../../icons";
import { fmtDate, fmtUSD } from "../../utils/format";

/**
 * Sistema de alerta temprana: combina las alertas reales del backend (quiebres de
 * stock, tasa desactualizada, etc.) con dos señales derivadas del rango —
 * clientes en riesgo de fuga y productos sin demanda — priorizadas por severidad.
 */

interface Item {
  severity: "crit" | "warn" | "info";
  title: string;
  detail: string;
}

const SEV = {
  crit: "border-l-error-500 bg-error-50/60 dark:bg-error-500/10",
  warn: "border-l-warning-500 bg-warning-50/60 dark:bg-warning-500/10",
  info: "border-l-blue-light-500 bg-blue-light-50/60 dark:bg-blue-light-500/10",
} as const;

const sevFromBackend = (s: string): Item["severity"] => (s === "CRIT" ? "crit" : s === "WARN" ? "warn" : "info");

export default function AlertsPanel({
  alerts,
  atRisk,
  noDemand,
  noDemandCount,
}: {
  alerts: DashboardAlert[];
  atRisk: ExecCustomerRow[];
  noDemand: NoDemandRow[];
  noDemandCount: number;
}) {
  const items: Item[] = [];

  for (const a of alerts) {
    items.push({ severity: sevFromBackend(a.severity), title: a.title, detail: a.message });
  }
  if (atRisk.length) {
    const top = atRisk[0];
    items.push({
      severity: "warn",
      title: `${atRisk.length} cliente(s) en riesgo de fuga`,
      detail: `El más relevante: ${top.name} — última compra ${fmtDate(top.last_purchase)} (${fmtUSD(top.revenue)} históricos).`,
    });
  }
  if (noDemandCount) {
    const names = noDemand.slice(0, 3).map((p) => p.name).join(", ");
    items.push({
      severity: "info",
      title: `${noDemandCount} producto(s) sin demanda en el periodo`,
      detail: names ? `Ej.: ${names}.` : "Productos activos sin ventas en el rango.",
    });
  }

  const order = { crit: 0, warn: 1, info: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <ChartCard title="Alertas tempranas" subtitle="Riesgos y oportunidades que requieren atención">
      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-8 text-sm text-gray-500 dark:text-gray-400">
          <CheckCircleIcon className="size-6 text-success-500" />
          Sin alertas activas: el negocio opera dentro de lo esperado.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.slice(0, 8).map((it, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-lg border-l-4 p-3 ${SEV[it.severity]}`}>
              <AlertHexaIcon
                className={`mt-0.5 size-5 shrink-0 ${
                  it.severity === "crit"
                    ? "text-error-500"
                    : it.severity === "warn"
                      ? "text-warning-500"
                      : "text-blue-light-500"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{it.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
