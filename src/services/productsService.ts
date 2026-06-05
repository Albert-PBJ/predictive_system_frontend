import { api } from "./api";
import type { Paginated } from "./types";

export interface Product {
  id: number;
  sku: string | null;
  name: string;
  full_name: string;
  category: number | null;
  category_name: string | null;
  material_display: string | null;
  sale_price_usd: string;
  purchase_price_usd: string | null;
  stock: number;
  min_stock: number;
  low_stock: boolean;
  is_active: boolean;
}

export interface ProductListParams {
  search?: string;
  category?: number;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export const productsService = {
  async list(params: ProductListParams = {}): Promise<Paginated<Product>> {
    const { data } = await api.get<Paginated<Product>>("/products/", { params });
    return data;
  },
};
