// Centraliza el acceso a los tokens JWT en localStorage.
// Tokens de acceso de vida corta + refresh con rotación mitigan el riesgo de XSS.

const ACCESS_KEY = "maescar.access";
const REFRESH_KEY = "maescar.refresh";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => {
    localStorage.setItem(ACCESS_KEY, access);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
