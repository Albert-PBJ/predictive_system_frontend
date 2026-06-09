import { useEffect, useState } from "react";
import { getApiError } from "../services/apiError";

/**
 * Hook simple para cargar datos una sola vez al montar (paneles de estadísticas).
 * Devuelve `{ data, loading, error }` y cancela el set de estado si se desmonta.
 */
export function useAsyncData<T>(fn: () => Promise<T>, fallbackMsg = "No se pudieron cargar los datos.") {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fn()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, fallbackMsg)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // Se ejecuta una vez al montar; `fn` se asume estable por página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}
