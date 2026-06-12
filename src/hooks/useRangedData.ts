import { useEffect, useState } from "react";
import { getApiError } from "../services/apiError";
import type { DateRange } from "../services/statsService";

/**
 * Variante de `useAsyncData` para los paneles con "máquina del tiempo" (la misma
 * lógica del panel de Inicio): mantiene el rango Desde/Hasta y recarga los datos
 * cada vez que cambia. Devuelve además `range`/`setRange` para conectar el
 * `DateRangeFilter`. Igual que en Inicio, los datos previos se conservan mientras
 * `loading` está activo (la página los atenúa en lugar de parpadear).
 */
export function useRangedData<T>(
  fn: (range: Partial<DateRange>) => Promise<T>,
  fallbackMsg = "No se pudieron cargar los datos.",
) {
  const [range, setRange] = useState<Partial<DateRange>>({});
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn(range)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, fallbackMsg)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // Recarga cuando cambian las fechas del rango; `fn` se asume estable por página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  return { range, setRange, data, loading, error };
}
