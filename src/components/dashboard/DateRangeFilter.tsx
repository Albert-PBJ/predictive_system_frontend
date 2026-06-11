import { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "../../icons";

/**
 * "Máquina del tiempo" del panel de Inicio: dos selectores de fecha (Desde / Hasta)
 * + accesos rápidos. Al cambiar cualquiera, se notifica el rango completo al padre,
 * que recarga TODO el panel para ese intervalo. Es un componente controlado: las
 * fechas vienen por props y los `setDate(.., false)` reflejan los presets sin
 * disparar `onChange` (evita bucles).
 */

interface Props {
  from: string;
  to: string;
  /** Límites de datos disponibles (primera/última venta) para los presets y el calendario. */
  min?: string;
  max?: string;
  onChange: (range: { from: string; to: string }) => void;
  loading?: boolean;
}

const fmt = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function DateRangeFilter({ from, to, min, max, onChange, loading }: Props) {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const fpFrom = useRef<flatpickr.Instance | null>(null);
  const fpTo = useRef<flatpickr.Instance | null>(null);
  // Mantener los valores/callback más recientes sin re-inicializar flatpickr.
  const latest = useRef({ from, to, onChange });
  latest.current = { from, to, onChange };

  useEffect(() => {
    if (!fromRef.current || !toRef.current) return;
    const common = { dateFormat: "Y-m-d", static: true, monthSelectorType: "static" as const };

    fpFrom.current = flatpickr(fromRef.current, {
      ...common,
      defaultDate: from,
      minDate: min,
      maxDate: max,
      onChange: ([d]) => {
        if (!d) return;
        const v = fmt(d);
        const cur = latest.current;
        cur.onChange({ from: v, to: cur.to < v ? v : cur.to });
      },
    }) as flatpickr.Instance;

    fpTo.current = flatpickr(toRef.current, {
      ...common,
      defaultDate: to,
      minDate: min,
      maxDate: max,
      onChange: ([d]) => {
        if (!d) return;
        const v = fmt(d);
        const cur = latest.current;
        cur.onChange({ from: cur.from > v ? v : cur.from, to: v });
      },
    }) as flatpickr.Instance;

    return () => {
      fpFrom.current?.destroy();
      fpTo.current?.destroy();
    };
    // Inicializa una sola vez; la sincronización va en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refleja cambios externos (presets) sin volver a disparar onChange.
  useEffect(() => {
    fpFrom.current?.setDate(from, false);
  }, [from]);
  useEffect(() => {
    fpTo.current?.setDate(to, false);
  }, [to]);

  const applyMonths = (months: number) => {
    const end = max ? new Date(`${max}T00:00:00`) : new Date();
    const start = new Date(end);
    start.setDate(1);
    start.setMonth(start.getMonth() - (months - 1));
    onChange({ from: fmt(start), to: fmt(end) });
  };
  const applyYTD = () => {
    const end = max ? new Date(`${max}T00:00:00`) : new Date();
    onChange({ from: `${end.getFullYear()}-01-01`, to: fmt(end) });
  };
  const applyAll = () => {
    if (min && max) onChange({ from: min, to: max });
  };

  const presetBtn =
    "rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-400";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Desde</label>
            <div className="relative">
              <input
                ref={fromRef}
                className="h-10 w-40 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <CalenderIcon className="size-5" />
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Hasta</label>
            <div className="relative">
              <input
                ref={toRef}
                className="h-10 w-40 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <CalenderIcon className="size-5" />
              </span>
            </div>
          </div>
          {loading && (
            <span className="mb-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Rápido:</span>
          <button type="button" className={presetBtn} onClick={() => applyMonths(1)}>
            1 mes
          </button>
          <button type="button" className={presetBtn} onClick={() => applyMonths(2)}>
            2 meses
          </button>
          <button type="button" className={presetBtn} onClick={() => applyMonths(3)}>
            3 meses
          </button>
          <button type="button" className={presetBtn} onClick={() => applyMonths(6)}>
            6 meses
          </button>
          <button type="button" className={presetBtn} onClick={() => applyMonths(12)}>
            12 meses
          </button>
          <button type="button" className={presetBtn} onClick={applyYTD}>
            Año actual
          </button>
          <button type="button" className={presetBtn} onClick={applyAll}>
            Todo
          </button>
        </div>
      </div>
    </div>
  );
}
