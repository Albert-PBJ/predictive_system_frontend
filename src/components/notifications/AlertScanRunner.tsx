import { useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { notificationsService } from "../../services/notificationsService";

// Roles que reciben alertas operativas/estratégicas y, por tanto, disparan el barrido
// (los vendedores y consulta no generan estas alertas). Espejo de la audiencia backend.
const SCAN_ROLES = ["ADMIN", "MANAGER", "WAREHOUSE"];
// Re-chequeo periódico para sesiones largas (además del disparo al iniciar sesión).
const RECHECK_MS = 60 * 60 * 1000;

/**
 * Dispara el **barrido predictivo de alertas** cuando un rol relevante tiene sesión.
 *
 * No hay cron en el backend: igual que las programaciones de scraping, el disparo
 * automático ocurre aquí. Al iniciar sesión un Gerente/Admin/Encargado —y cada hora
 * durante la sesión— se llama al scan (throttleado en el backend, así que dos usuarios
 * activos no lo ejecutan dos veces) y luego se refresca el feed. No renderiza nada.
 */
export default function AlertScanRunner() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const { refresh } = useNotifications();

  // Se redefine en cada render para capturar `refresh` fresco, pero el efecto solo
  // depende del estado de auth → el intervalo se crea una sola vez por sesión.
  const runRef = useRef<() => void>(() => {});
  runRef.current = async () => {
    if (!isAuthenticated || !role || !SCAN_ROLES.includes(role)) return;
    try {
      await notificationsService.scan();
      await refresh();
    } catch {
      // silencioso: no molestar al usuario si el barrido falla
    }
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated || !role || !SCAN_ROLES.includes(role)) return;
    runRef.current();
    const id = window.setInterval(() => runRef.current(), RECHECK_MS);
    return () => window.clearInterval(id);
  }, [isLoading, isAuthenticated, role]);

  return null;
}
