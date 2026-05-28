import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

// Evento que dispara la API cuando la sesión expira de forma irrecuperable.
// AuthContext lo escucha para limpiar el estado y redirigir al login.
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Cliente separado y "limpio" para el refresh, así no entra en el interceptor
// de respuesta (evita bucles infinitos de reintento).
const refreshClient = axios.create({ baseURL });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Coordina refresh concurrente: si varias peticiones reciben 401 a la vez,
// solo se hace un refresh y las demás esperan a ese resultado.
let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function flushQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
}

function forceLogout() {
  tokenStorage.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refresh = tokenStorage.getRefresh();
    if (!refresh) {
      forceLogout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Espera al refresh en curso y reintenta con el nuevo token.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => {
            original.headers = original.headers ?? {};
            (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
            original._retry = true;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await refreshClient.post("/auth/refresh", { refresh });
      const newAccess = data.access as string;
      // Con ROTATE_REFRESH_TOKENS el backend devuelve también un refresh nuevo.
      const newRefresh = (data.refresh as string | undefined) ?? refresh;
      tokenStorage.set(newAccess, newRefresh);
      flushQueue(null, newAccess);

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
