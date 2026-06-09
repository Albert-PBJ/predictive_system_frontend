import type { ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "../../icons";
import Badge from "../ui/badge/Badge";
import { fmtPct } from "../../utils/format";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Variación porcentual; positiva = badge verde, negativa = rojo. */
  deltaPct?: number | null;
  hint?: string;
}

/** Tarjeta de indicador (KPI) con ícono y badge de variación opcional. */
export default function StatCard({ label, value, icon, deltaPct, hint }: StatCardProps) {
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(deltaPct);
  const up = (deltaPct ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <div className={`flex items-end justify-between ${icon ? "mt-5" : ""}`}>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{value}</h4>
          {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
        </div>
        {hasDelta && (
          <Badge color={up ? "success" : "error"}>
            {up ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {fmtPct(Math.abs(deltaPct as number))}
          </Badge>
        )}
      </div>
    </div>
  );
}
