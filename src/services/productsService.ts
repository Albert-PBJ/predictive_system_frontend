import { api } from "./api";
import type { Paginated } from "./types";

// Producto del catálogo. Los decimales llegan como string (DRF serializa Decimal
// así). `stock` es de solo lectura: se ajusta en el módulo de Inventario.
export interface Product {
  id: number;
  sku: string | null;
  name: string;
  full_name: string;
  category: number | null;
  category_name: string | null;
  material: string | null;
  material_display: string | null;
  colors: string[];
  // Precios
  purchase_price_usd: string | null;
  sale_price_usd: string;
  // Inventario
  stock: number;
  min_stock: number;
  low_stock: boolean;
  // Metadatos
  is_manufactured: boolean;
  is_active: boolean;
}

// Campos editables que se envían al crear/actualizar (sin stock ni read-only).
export interface ProductInput {
  sku: string | null;
  name: string;
  full_name: string;
  category: number | null;
  material: string | null;
  colors: string[];
  purchase_price_usd: string | null;
  sale_price_usd: string;
  min_stock: number;
  is_manufactured: boolean;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

// Prefijo de SKU que marca un **servicio** (p. ej. "Mantenimiento"): sin inventario y
// de precio flexible (se fija al registrar la venta). Debe coincidir con
// `SERVICE_SKU_PREFIX` del backend (apps/core/models.py).
export const SERVICE_SKU_PREFIX = "MSC-SERV-";

/** True si el producto es un servicio (sin stock, precio flexible en la venta). */
export const isService = (p: Pick<Product, "sku">): boolean =>
  !!p.sku && p.sku.startsWith(SERVICE_SKU_PREFIX);

export interface ProductListParams {
  search?: string;
  category?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

// Materiales (enum fijo del modelo Product.MaterialChoices) con etiqueta en español.
export const MATERIAL_OPTIONS: { value: string; label: string }[] = [
  { value: "MESH", label: "Malla Mesh" },
  { value: "BIPIEL", label: "Bipiel" },
  { value: "FABRIC", label: "Tela" },
  { value: "METAL", label: "Metal" },
  { value: "WOOD", label: "Madera/Melamina" },
  { value: "OTHER", label: "Otro" },
];

export const productsService = {
  async list(params: ProductListParams = {}): Promise<Paginated<Product>> {
    const { data } = await api.get<Paginated<Product>>("/products/", { params });
    return data;
  },

  async get(id: number): Promise<Product> {
    const { data } = await api.get<Product>(`/products/${id}/`);
    return data;
  },

  async create(payload: ProductInput): Promise<Product> {
    const { data } = await api.post<Product>("/products/", payload);
    return data;
  },

  async update(id: number, payload: ProductInput): Promise<Product> {
    const { data } = await api.put<Product>(`/products/${id}/`, payload);
    return data;
  },

  async categories(): Promise<Category[]> {
    const { data } = await api.get<Category[]>("/categories");
    return data;
  },
};
