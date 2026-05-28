import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { Role } from "../../services/auth.types";

interface ProtectedRouteProps {
  children: ReactNode;
  // Si se indican roles, el usuario debe tener uno de ellos para entrar.
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 dark:text-gray-400">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated) {
    // Recuerda a dónde quería ir para volver tras el login.
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
