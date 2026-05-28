import { api } from "./api";
import { tokenStorage } from "./tokenStorage";
import type { AuthUser, LoginResponse } from "./auth.types";

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", {
      username,
      password,
    });
    tokenStorage.set(data.access, data.refresh);
    return data;
  },

  async logout(): Promise<void> {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) {
        // Invalida el refresh token en el backend (blacklist).
        await api.post("/auth/logout", { refresh });
      }
    } finally {
      tokenStorage.clear();
    }
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  },
};
