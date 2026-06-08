// Formato de valores de pronóstico según su tipo (value_kind del backend).
import { fmtUSD, fmtVES } from "../../utils/format";
import type { ValueKind } from "../../services/analyticsService";

export function fmtValue(value: number | null | undefined, kind: ValueKind): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  switch (kind) {
    case "usd":
      return fmtUSD(n);
    case "ves":
      return fmtVES(n);
    case "rate":
      return `${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`;
    case "percent":
      return `${n.toLocaleString("es-VE", { maximumFractionDigits: 1 })}%`;
    case "int":
    default:
      return n.toLocaleString("es-VE", { maximumFractionDigits: 0 });
  }
}

// Color del posicionamiento de precio frente al mercado.
export function positionMeta(position: string | null): { label: string; color: "success" | "warning" | "error" | "info" } {
  switch (position) {
    case "below":
      return { label: "Por debajo del mercado", color: "success" };
    case "above":
      return { label: "Por encima del mercado", color: "error" };
    case "within":
      return { label: "En rango de mercado", color: "info" };
    default:
      return { label: "Sin referencia propia", color: "warning" };
  }
}
