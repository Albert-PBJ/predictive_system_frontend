import { AxiosError } from "axios";

// Extrae un mensaje de error legible de una respuesta de la API.
// El backend devuelve errores de negocio como { error: "..." } y errores de
// validación de DRF como { campo: ["..."] } o { detail: "..." }.
export function getApiError(err: unknown, fallback = "Ocurrió un error inesperado."): string {
  const axiosErr = err as AxiosError<Record<string, unknown>>;
  const data = axiosErr?.response?.data;
  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (typeof data.error === "string") return data.error;
  if (typeof data.detail === "string") return data.detail;

  // Toma el primer error de validación de campo disponible.
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const value = data[firstKey];
    const msg = Array.isArray(value) ? value[0] : value;
    if (typeof msg === "string") {
      return firstKey === "non_field_errors" ? msg : `${firstKey}: ${msg}`;
    }
  }
  return fallback;
}
