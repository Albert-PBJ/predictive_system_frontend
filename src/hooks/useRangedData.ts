import { useEffect, useState } from "react";
import { getApiError } from "../services/apiError";
import { useDateRange, type RangeScope } from "../context/DateRangeContext";
import type { DateRange } from "../services/statsService";

/**
 * Variante de `useAsyncData` para los paneles con "máquina del tiempo" (la misma
 * lógica del panel de Inicio): recarga los datos cada vez que cambia el rango
 * Desde/Hasta. Devuelve además `range`/`setRange` para conectar el
 * `DateRangeFilter`. Igual que en Inicio, los datos previos se conservan mientras
 * `loading` está activo (la página los atenúa en lugar de parpadear).
 *
 * El rango **no** es local a la página: vive en `DateRangeContext` (ámbito
 * `business` por defecto), de modo que el que elige el usuario se conserva al
 * navegar entre Inicio y las páginas de Estadísticas.
 */
export function useRangedData<T>(
  fn: (range: Partial<DateRange>) => Promise<T>,
  fallbackMsg = "No se pudieron cargar los datos.",
  scope: RangeScope = "business",
) {
  const { range, setRange } = useDateRange(scope);
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
