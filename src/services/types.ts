// Tipos compartidos por los servicios de datos.

// Forma estándar de las respuestas paginadas de DRF (PageNumberPagination).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

import type { Role } from "./auth.types";

// Roles con acceso a ventas e inventario (Vendedor o superior).
export const SELLER_AND_ABOVE: Role[] = ["ADMIN", "MANAGER", "SELLER"];
