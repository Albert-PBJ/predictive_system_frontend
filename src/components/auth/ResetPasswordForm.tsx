import { useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { AxiosError } from "axios";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { authService } from "../../services/authService";
import { getApiError } from "../../services/apiError";

const MIN_LENGTH = 10;

// El backend devuelve los errores de contraseña débil como { new_password: [...] };
// los unimos sin el prefijo del campo. El resto cae al extractor genérico.
function resetError(err: unknown): string {
  const data = (err as AxiosError<Record<string, unknown>>)?.response?.data;
  if (data && Array.isArray(data.new_password)) {
    return (data.new_password as string[]).join(" ");
  }
  return getApiError(err, "No se pudo restablecer la contraseña. Intenta de nuevo.");
}

export default function ResetPasswordForm() {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const hasLink = Boolean(uid && token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const { detail } = await authService.confirmPasswordReset(uid, token, password);
      setDone(detail);
    } catch (err) {
      setError(resetError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Volver a iniciar sesión
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Nueva contraseña
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Elige una contraseña nueva para tu cuenta (mínimo {MIN_LENGTH} caracteres).
            </p>
          </div>

          {!hasLink ? (
            <div className="space-y-6">
              <div
                role="alert"
                className="rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400"
              >
                El enlace de recuperación es inválido o está incompleto. Solicita uno nuevo.
              </div>
              <Link
                to="/recuperar-contrasena"
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
              >
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-6">
              <div
                role="status"
                className="rounded-lg border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400"
              >
                {done}
              </div>
              <Link
                to="/signin"
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600"
              >
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400"
                  >
                    {error}
                  </div>
                )}
                <div>
                  <Label>
                    Nueva contraseña <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="new_password"
                      placeholder="Ingresa tu nueva contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <Label>
                    Confirmar contraseña <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    name="confirm_password"
                    placeholder="Repite la nueva contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={submitting || !password || !confirm}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300"
                  >
                    {submitting ? "Guardando…" : "Restablecer contraseña"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
