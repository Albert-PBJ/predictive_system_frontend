// Tipos compartidos por los servicios de datos.

// Forma estándar de las respuestas paginadas de DRF (PageNumberPagination).
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

import type { Role } from "./auth.types";

// Separación de funciones entre ventas e inventario (el espejo del backend):
//
//   ADMIN > MANAGER > { SELLER, WAREHOUSE } > VIEWER
//
// El vendedor y el encargado de inventario son "hermanos": el vendedor vende y
// solo consulta el stock; el encargado gestiona el stock y solo consulta las
// ventas; el gerente/admin puede con ambas cosas.

// Pueden registrar ventas (capacidad de vender; NO el encargado de inventario).
export const CAN_REGISTER_SALES: Role[] = ["ADMIN", "MANAGER", "SELLER"];

// Pueden modificar el stock directamente con movimientos manuales
// (NO los vendedores: las ventas descuentan el stock de forma indirecta).
export const CAN_MANAGE_STOCK: Role[] = ["ADMIN", "MANAGER", "WAREHOUSE"];

// Personal operativo: consulta compartida de ventas, inventario y catálogo.
export const OPERATIONAL_ROLES: Role[] = ["ADMIN", "MANAGER", "SELLER", "WAREHOUSE"];
