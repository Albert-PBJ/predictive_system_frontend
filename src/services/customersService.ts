import { api } from "./api";
import type { Paginated } from "./types";

export interface Customer {
  id: number;
  rif: string;
  company_name: string;
  customer_type: string;
  customer_type_display: string;
  sector: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_full_name: string;
  contact_ci: string;
  phone: string;
  mobile: string;
  email: string;
  state: string;
  municipality: string;
  parish: string;
  fiscal_address: string;
  total_employees: number | null;
  is_active_customer: boolean;
  created_at: string;
}

export interface NewCustomer {
  rif: string;
  company_name: string;
  customer_type?: string;
  sector?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  phone?: string;
  email?: string;
  state?: string;
  municipality?: string;
}

export interface CustomerListParams {
  search?: string;
  customer_type?: string;
  state?: string;
  page?: number;
  page_size?: number;
}

export const customersService = {
  async list(params: CustomerListParams = {}): Promise<Paginated<Customer>> {
    const { data } = await api.get<Paginated<Customer>>("/customers/", { params });
    return data;
  },

  async create(payload: NewCustomer): Promise<Customer> {
    const { data } = await api.post<Customer>("/customers/", payload);
    return data;
  },
};

// Tipos de cliente (deben coincidir con core.Customer.TypeChoices).
export const CUSTOMER_TYPES = [
  { value: "CORP", label: "Empresarial" },
  { value: "INST", label: "Institucional" },
  { value: "IND", label: "Particular" },
];
