import { useState } from "react";
import { Link } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { SCRAPER_META, useScraper } from "../../context/ScraperContext";
import { useNotifications } from "../../context/NotificationsContext";
import type { AlertSeverity, AppNotification } from "../../services/notificationsService";
import { fmtDateTime } from "../../utils/format";

// Tope de ítems mostrados en la campana; el resto vive en "Ver todas".
const DROPDOWN_CAP = 8;

// Estilo del punto/ícono por severidad (rojo crítico, ámbar advertencia, azul info).
const SEV_DOT: Record<AlertSeverity, string> = {
  CRIT: "bg-error-500",
  WARN: "bg-warning-500",
  INFO: "bg-blue-light-500",
};
const SEV_RING: Record<AlertSeverity, string> = {
  CRIT: "bg-error-50 text-error-500 dark:bg-error-500/15",
  WARN: "bg-warning-50 text-warning-500 dark:bg-warning-500/15",
  INFO: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15",
};

function AlertRow({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  return (
    <li>
      <DropdownItem
        tag="a"
        to="/notificaciones"
        onItemClick={onClick}
        className="flex items-start gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEV_RING[n.severity]}`}
        >
          <span className={`h-2 w-2 rounded-full ${SEV_DOT[n.severity]}`} />
        </span>
        <span className="block min-w-0">
          <span className="mb-0.5 flex items-center gap-2">
            <span className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {n.title}
            </span>
            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
          </span>
          <span className="line-clamp-2 block text-theme-xs text-gray-500 dark:text-gray-400">
            {n.message}
          </span>
          <span className="mt-1 flex items-center gap-2 text-theme-xs text-gray-400">
            <span>{n.type_label}</span>
            <span>·</span>
            <span>{fmtDateTime(n.created_at)}</span>
            {n.is_resolved && <span className="text-success-500">· resuelta</span>}
          </span>
        </span>
      </DropdownItem>
    </li>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const {
    notifications: scraperNotifs,
    unreadCount: scraperUnread,
    markNotificationsRead,
  } = useScraper();

  const totalUnread = unreadCount + scraperUnread;

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    // Al abrir, marcamos todo como leído para apagar el indicador.
    if (opening) {
      markAllRead();
      markNotificationsRead();
    }
  };

  const shownAlerts = notifications.slice(0, DROPDOWN_CAP);
  const empty = notifications.length === 0 && scraperNotifs.length === 0;

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            totalUnread === 0 ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notificaciones
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {empty && (
            <li className="px-2 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
              No hay notificaciones.
            </li>
          )}

          {shownAlerts.map((n) => (
            <AlertRow key={`alert-${n.id}`} n={n} onClick={closeDropdown} />
          ))}

          {/* Notificaciones de scraping (efímeras, solo del ADMIN que las disparó). */}
          {scraperNotifs.map((n) => (
            <li key={n.id}>
              <DropdownItem
                tag="a"
                to={SCRAPER_META[n.source].path}
                onItemClick={closeDropdown}
                className="flex items-center gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-success-50 text-success-500 dark:bg-success-500/15">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="fill-current">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.7 12a8.3 8.3 0 1116.6 0 8.3 8.3 0 01-16.6 0Zm8.3-10.1A10.1 10.1 0 1022.1 12 10.1 10.1 0 0012 1.9Zm3.62 8.84a.9.9 0 10-1.27-1.27l-3.16 3.15-1.53-1.53a.9.9 0 10-1.27 1.27l2.17 2.17a.9.9 0 001.27 0l3.79-3.79Z"
                    />
                  </svg>
                </span>
                <span className="block">
                  <span className="mb-0.5 block text-theme-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {SCRAPER_META[n.source].label}
                    </span>
                    <span>
                      {n.stopped
                        ? " — recolección detenida (se guardó lo procesado)"
                        : " — recolección de datos completada"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                    <span>{n.saved} registro(s) guardados</span>
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>

        <Link
          to="/notificaciones"
          onClick={closeDropdown}
          className="mt-3 block rounded-lg border border-gray-200 bg-white p-2.5 text-center text-theme-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Ver todas las notificaciones
        </Link>
      </Dropdown>
    </div>
  );
}
