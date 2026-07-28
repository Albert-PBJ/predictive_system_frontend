import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DateRange } from "../services/statsService";

/**
 * Rango de la "máquina del tiempo" **compartido entre páginas**.
 *
 * Antes cada panel guardaba su propio `useState`, así que al navegar (por ejemplo
 * de Inicio a Estadísticas) el rango elegido se perdía y volvía al valor por
 * defecto del backend. Aquí vive un único rango por ámbito, que sobrevive a la
 * navegación y a un recargado de la pestaña (`sessionStorage`).
 *
 * Hay dos ámbitos porque miden cosas distintas y tienen límites de datos
 * distintos: `business` (Inicio + Estadísticas, sobre ventas propias) y
 * `benchmarking` (observaciones de mercado scrapeadas, ventana mucho más corta).
 * Un rango de 2022 elegido en Inicio dejaría el benchmarking vacío, así que cada
 * ámbito recuerda el suyo.
 *
 * Un rango vacío (`{}`) significa "sin elegir": el backend aplica su propio valor
 * por defecto (2 meses en Inicio, 1 mes en los paneles de detalle).
 */

export type RangeScope = "business" | "benchmarking";

type Ranges = Record<RangeScope, Partial<DateRange>>;

const STORAGE_KEY = "maescar.dateRange";
/** Evento para vaciar el rango al cerrar sesión (lo emite `clearStoredRanges`). */
const RESET_EVENT = "maescar:date-range-reset";

const EMPTY: Ranges = { business: {}, benchmarking: {} };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Solo acepta fechas con formato válido; cualquier basura guardada se descarta. */
function sanitize(raw: unknown): Partial<DateRange> {
  if (!raw || typeof raw !== "object") return {};
  const { from, to } = raw as Partial<DateRange>;
  const range: Partial<DateRange> = {};
  if (isDate(from)) range.from = from;
  if (isDate(to)) range.to = to;
  return range;
}

function loadRanges(): Ranges {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Ranges>;
    return {
      business: sanitize(parsed?.business),
      benchmarking: sanitize(parsed?.benchmarking),
    };
  } catch {
    return EMPTY;
  }
}

/** Borra el rango guardado (al cerrar sesión: el siguiente usuario empieza limpio). */
// eslint-disable-next-line react-refresh/only-export-components
export function clearStoredRanges() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* almacenamiento no disponible: nada que limpiar */
  }
  window.dispatchEvent(new Event(RESET_EVENT));
}

interface DateRangeContextValue {
  ranges: Ranges;
  setScopeRange: (scope: RangeScope, range: Partial<DateRange>) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [ranges, setRanges] = useState<Ranges>(loadRanges);

  const setScopeRange = useCallback((scope: RangeScope, range: Partial<DateRange>) => {
    setRanges((prev) => {
      const next = { ...prev, [scope]: sanitize(range) };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* modo privado / almacenamiento lleno: el rango sigue viviendo en memoria */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const onReset = () => setRanges(EMPTY);
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, []);

  const value = useMemo(() => ({ ranges, setScopeRange }), [ranges, setScopeRange]);
  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>;
}

/**
 * Rango compartido del ámbito indicado. `setRange` encaja directamente con el
 * `onChange` de `DateRangeFilter`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDateRange(scope: RangeScope = "business") {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange debe usarse dentro de <DateRangeProvider>");
  const { ranges, setScopeRange } = ctx;
  const setRange = useCallback(
    (range: Partial<DateRange>) => setScopeRange(scope, range),
    [scope, setScopeRange],
  );
  return { range: ranges[scope], setRange };
}
