import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import {
  scraperScheduleService,
  FREQUENCY_LABELS,
  type ScheduleFrequency,
  type ScraperSchedule,
  type ScheduleInput,
} from "../../services/scraperScheduleService";
import type { ScraperSource } from "../../context/ScraperContext";
import { getApiError } from "../../services/apiError";

const selectClass =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const SOURCE_OPTIONS: { value: ScraperSource; label: string; urlLabel: string; placeholder: string }[] = [
  { value: "instagram", label: "Instagram", urlLabel: "URLs de perfiles", placeholder: "https://www.instagram.com/competidor/" },
  { value: "website", label: "Sitios Web", urlLabel: "URLs de sitios", placeholder: "https://competidor.com/productos/" },
  { value: "mercadolibre", label: "Mercado Libre", urlLabel: "Términos de búsqueda", placeholder: "Sillas de oficina" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScraperSchedule | null; // null = crear
  onSaved: () => void;
}

const EMPTY = {
  name: "",
  source: "instagram" as ScraperSource,
  urlsText: "",
  competitor_name: "",
  limit: "50",
  frequency: "MONTHLY" as ScheduleFrequency,
  is_active: true,
  next_run_at: "", // datetime-local; vacío = corre en la próxima sesión (ahora)
};

type FormState = typeof EMPTY;

// ISO (con zona) → valor de <input type="datetime-local"> en hora local.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromSchedule(s: ScraperSchedule): FormState {
  return {
    name: s.name ?? "",
    source: s.source,
    urlsText: (s.urls ?? []).join("\n"),
    competitor_name: s.competitor_name ?? "",
    limit: String(s.limit ?? 50),
    frequency: s.frequency,
    is_active: s.is_active,
    next_run_at: toLocalInput(s.next_run_at),
  };
}

export default function ScheduleFormModal({ isOpen, onClose, schedule, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = schedule !== null;

  useEffect(() => {
    if (isOpen) {
      setForm(schedule ? fromSchedule(schedule) : EMPTY);
      setError(null);
    }
  }, [isOpen, schedule]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const sourceCfg = SOURCE_OPTIONS.find((o) => o.value === form.source)!;

  const handleSubmit = async () => {
    setError(null);
    const urls = form.urlsText
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) {
      setError("Agrega al menos una URL o término de búsqueda.");
      return;
    }
    const limit = parseInt(form.limit, 10);
    if (Number.isNaN(limit) || limit < 1) {
      setError("El límite debe ser un entero positivo.");
      return;
    }

    const payload: ScheduleInput = {
      name: form.name.trim(),
      source: form.source,
      urls,
      competitor_name: form.source === "website" ? form.competitor_name.trim() : "",
      limit,
      frequency: form.frequency,
      is_active: form.is_active,
    };
    // datetime-local → ISO (hora local del navegador). Solo si el admin la fijó.
    if (form.next_run_at) payload.next_run_at = new Date(form.next_run_at).toISOString();

    setSubmitting(true);
    try {
      if (isEdit) await scraperScheduleService.update(schedule!.id, payload);
      else await scraperScheduleService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(getApiError(err, "No se pudo guardar la programación."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-2xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="px-6 pt-6 sm:px-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {isEdit ? "Editar programación" : "Nueva programación de scraping"}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Se ejecuta automáticamente con la frecuencia elegida cuando un administrador
            inicia sesión y la programación está vencida.
          </p>
          {error && (
            <div className="mt-4">
              <Alert variant="error" title="No se pudo guardar" message={error} />
            </div>
          )}
        </div>

        <div className="custom-scrollbar overflow-y-auto px-6 py-5 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Competidores Instagram (mensual)"
              />
            </div>
            <div>
              <Label>Fuente *</Label>
              <select
                className={selectClass}
                value={form.source}
                onChange={(e) => set("source", e.target.value as ScraperSource)}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Label>{sourceCfg.urlLabel} *</Label>
            <TextArea
              rows={5}
              value={form.urlsText}
              onChange={(v) => set("urlsText", v)}
              placeholder={sourceCfg.placeholder}
              hint="Una por línea. Se re-scrapean todas en cada corrida."
            />
          </div>

          {form.source === "website" && (
            <div className="mt-4">
              <Label>Nombre del competidor (opcional)</Label>
              <Input
                value={form.competitor_name}
                onChange={(e) => set("competitor_name", e.target.value)}
                placeholder="Si se omite, se usa el nombre del sitio"
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label>Frecuencia *</Label>
              <select
                className={selectClass}
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value as ScheduleFrequency)}
              >
                {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Límite de resultados</Label>
              <Input
                type="number"
                min="1"
                value={form.limit}
                onChange={(e) => set("limit", e.target.value)}
              />
            </div>
            <div>
              <Label>Estado</Label>
              <select
                className={selectClass}
                value={form.is_active ? "true" : "false"}
                onChange={(e) => set("is_active", e.target.value === "true")}
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <Label>Primera ejecución (opcional)</Label>
            <Input
              type="datetime-local"
              value={form.next_run_at}
              onChange={(e) => set("next_run_at", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Si se deja vacío, la primera corrida ocurre en la próxima sesión del administrador.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4 sm:px-8 dark:border-gray-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear programación"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
