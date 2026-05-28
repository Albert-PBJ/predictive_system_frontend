import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authService } from "../services/authService";
import { SESSION_EXPIRED_EVENT } from "../services/api";
import { tokenStorage } from "../services/tokenStorage";
import type { AuthUser, Role } from "../services/auth.types";

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar: si hay token guardado, recupera el usuario actual.
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        if (active) setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  // La API avisa cuando el refresh falla de forma irrecuperable.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await authService.login(username, password);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
