import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import Switch from "../../components/form/switch/Switch";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import {
  settingsService,
  type SettingsMeta,
  type SystemSettingsData,
  type LatestRate,
} from "../../services/settingsService";
import { getApiError } from "../../services/apiError";

// Campos booleanos (se renderizan como Switch). El resto se maneja como texto.
type BooleanKey =
  | "use_llm_enrichment"
  | "enable_llm_report_narrative"
  | "use_vision_price_ocr"
  | "ocr_use_gpu"
  | "ocr_assume_usd_for_bare_number"
  | "discard_instagram_without_price";

type EditableKey = keyof Omit<SystemSettingsData, "updated_at">;
type FormState = Record<EditableKey, string | boolean>;

const RATE_BASIS_OPTIONS = [
  { value: "PAR", label: "Paralela" },
  { value: "BCV", label: "BCV (oficial)" },
  { value: "AVG", label: "Promedio BCV/Paralela" },
];

function toForm(data: SystemSettingsData): FormState {
  const out = {} as FormState;
  (Object.keys(data) as (keyof SystemSettingsData)[]).forEach((k) => {
    if (k === "updated_at") return;
    const key = k as EditableKey;
    const value = data[k];
    out[key] = typeof value === "boolean" ? value : value == null ? "" : String(value);
  });
  return out;
}

// Pequeña fila de formulario: etiqueta + control + ayuda.
function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {help ? <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
    </div>
  );
}

// Chip de estado (presente/ausente) para las integraciones.
function StatusChip({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
          : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success-500" : "bg-warning-500"}`} />
      {ok ? okText : badText}
    </span>
  );
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [meta, setMeta] = useState<SettingsMeta | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Carga manual de la tasa de cambio.
  const [bcvInput, setBcvInput] = useState("");
  const [parallelInput, setParallelInput] = useState("");
  const [rateBusy, setRateBusy] = useState(false);
  const [rateMsg, setRateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Prueba de conexión con el LLM.
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmMsg, setLlmMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    settingsService
      .get()
      .then((res) => {
        if (!active) return;
        setForm(toForm(res.settings));
        setMeta(res.meta);
        setUpdatedAt(res.settings.updated_at);
      })
      .catch((e) => active && setLoadError(getApiError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const set = (key: EditableKey, value: string | boolean) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await settingsService.update(form as never);
      setForm(toForm(res.settings));
      setMeta(res.meta);
      setUpdatedAt(res.settings.updated_at);
      setSaveMsg({ ok: true, text: "Configuración guardada correctamente." });
    } catch (e) {
      setSaveMsg({ ok: false, text: getApiError(e) });
    } finally {
      setSaving(false);
    }
  };

  const applyRate = (rate: LatestRate) => setMeta((m) => (m ? { ...m, latest_rate: rate } : m));

  const handleSetRate = async () => {
    if (!bcvInput.trim()) {
      setRateMsg({ ok: false, text: "Ingresa al menos la tasa BCV." });
      return;
    }
    setRateBusy(true);
    setRateMsg(null);
    try {
      const r = await settingsService.setExchangeRate({
        bcv: bcvInput.trim(),
        parallel: parallelInput.trim() || undefined,
      });
      applyRate({
        date: r.date,
        bcv_rate: r.bcv_rate,
        parallel_rate: r.parallel_rate,
        effective_rate: r.effective_rate,
        source: r.source,
      });
      setBcvInput("");
      setParallelInput("");
      setRateMsg({ ok: true, text: `Tasa cargada (${r.date}).` });
    } catch (e) {
      setRateMsg({ ok: false, text: getApiError(e) });
    } finally {
      setRateBusy(false);
    }
  };

  const handleFetchRate = async () => {
    setRateBusy(true);
    setRateMsg(null);
    try {
      const r = await settingsService.fetchExchangeRate();
      applyRate({
        date: r.date,
        bcv_rate: r.bcv_rate,
        parallel_rate: r.parallel_rate,
        effective_rate: r.effective_rate,
        source: r.source,
      });
      const src = r.provider ? ` (${r.provider})` : "";
      // Las fuentes de la paralela a veces están caídas: avisa si solo se trajo la BCV.
      const note =
        r.parallel_rate == null ? " No había una tasa paralela válida; cárgala manualmente si la necesitas." : "";
      setRateMsg({ ok: true, text: `Tasa actualizada${src} (${r.date}).${note}` });
    } catch (e) {
      setRateMsg({ ok: false, text: getApiError(e) });
    } finally {
      setRateBusy(false);
    }
  };

  const handleTestLLM = async () => {
    setLlmBusy(true);
    setLlmMsg(null);
    try {
      const res = await settingsService.testLLM();
      if (res.ok) {
        setLlmMsg({ ok: true, text: "Conexión con DeepSeek exitosa." });
      } else {
        const err = res.error;
        const code = err?.status_code ? ` (HTTP ${err.status_code})` : "";
        setLlmMsg({ ok: false, text: `${err?.message || "Falló la prueba."}${code}` });
      }
    } catch (e) {
      setLlmMsg({ ok: false, text: getApiError(e) });
    } finally {
      setLlmBusy(false);
    }
  };

  const latest = meta?.latest_rate ?? null;
  const lastUpdatedLabel = useMemo(() => {
    if (!updatedAt) return null;
    try {
      return new Date(updatedAt).toLocaleString("es-VE");
    } catch {
      return updatedAt;
    }
  }, [updatedAt]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (loadError || !form) {
    return (
      <>
        <PageMeta title="Configuración del Sistema" description="Ajustes globales" />
        <PageBreadcrumb pageTitle="Configuración del Sistema" />
        <Alert variant="error" title="No se pudo cargar la configuración" message={loadError || "Error desconocido."} />
      </>
    );
  }

  const bool = (k: BooleanKey) => form[k] as boolean;
  const str = (k: EditableKey) => form[k] as string;

  return (
    <>
      <PageMeta title="Configuración del Sistema" description="Ajustes globales del sistema" />
      <PageBreadcrumb pageTitle="Configuración del Sistema" />

      {/* Barra de acciones */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Parámetros globales del sistema. Los cambios aplican de inmediato, sin reiniciar el servidor.
          {lastUpdatedLabel ? <span className="ml-1">Última actualización: {lastUpdatedLabel}.</span> : null}
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      {saveMsg ? (
        <div className="mb-6">
          <Alert
            variant={saveMsg.ok ? "success" : "error"}
            title={saveMsg.ok ? "Listo" : "Error al guardar"}
            message={saveMsg.text}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Tasa de cambio ─────────────────────────────────────────── */}
        <ComponentCard title="Tasa de cambio" desc="Carga la tasa BCV/paralela y elige cómo se convierte USD→VES.">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
            {latest ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">BCV</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-white/90">{latest.bcv_rate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paralela</p>
                  <p className="text-base font-semibold text-gray-800 dark:text-white/90">{latest.parallel_rate ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Efectiva</p>
                  <p className="text-base font-semibold text-brand-500">{latest.effective_rate ?? "—"}</p>
                </div>
                <p className="col-span-3 mt-1 text-xs text-gray-400">Vigente del {latest.date}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay ninguna tasa cargada.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="BCV (Bs/USD)">
              <Input type="number" step={0.0001} placeholder="36.50" value={bcvInput} onChange={(e) => setBcvInput(e.target.value)} />
            </Field>
            <Field label="Paralela (Bs/USD)">
              <Input type="number" step={0.0001} placeholder="40.00" value={parallelInput} onChange={(e) => setParallelInput(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" onClick={handleSetRate} disabled={rateBusy}>
              {rateBusy ? "…" : "Cargar tasa manual"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleFetchRate} disabled={rateBusy}>
              Actualizar desde API
            </Button>
          </div>
          {rateMsg ? (
            <Alert variant={rateMsg.ok ? "success" : "error"} title={rateMsg.ok ? "Tasa" : "Error"} message={rateMsg.text} />
          ) : null}

          <hr className="border-gray-100 dark:border-gray-800" />

          <Field label="Base para convertir USD→VES" help="Qué tasa usan ventas, presupuestos y reportes.">
            <Select options={RATE_BASIS_OPTIONS} defaultValue={str("rate_basis")} onChange={(v) => set("rate_basis", v)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tasa vencida tras (días)" help="Más allá de esta antigüedad se levanta una alerta.">
              <Input type="number" min="1" value={str("rate_max_age_days")} onChange={(e) => set("rate_max_age_days", e.target.value)} />
            </Field>
            <Field label="URL de la API de tasa">
              <Input value={str("exchange_rate_api_url")} onChange={(e) => set("exchange_rate_api_url", e.target.value)} />
            </Field>
          </div>
        </ComponentCard>

        {/* ── Enriquecimiento con IA ─────────────────────────────────── */}
        <ComponentCard title="Enriquecimiento con IA (LLM)" desc="DeepSeek para limpiar/clasificar datos de scrapers y redactar el reporte.">
          <div className="flex flex-wrap gap-2">
            <StatusChip ok={!!meta?.deepseek_key_present} okText="Clave configurada" badText="Sin clave (DEEPSEEK_API_KEY)" />
            <StatusChip ok={!!meta?.openai_installed} okText="Paquete openai instalado" badText="Falta el paquete openai" />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Switch label="Activar enriquecimiento en scrapers" defaultChecked={bool("use_llm_enrichment")} onChange={(c) => set("use_llm_enrichment", c)} />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Requiere la clave en el entorno.</p>
            </div>
          </div>
          <div>
            <Switch label="Permitir reporte ejecutivo redactado por IA" defaultChecked={bool("enable_llm_report_narrative")} onChange={(c) => set("enable_llm_report_narrative", c)} />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Interruptor propio del reporte (independiente de los scrapers). Si falla, cae a la síntesis determinista.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Modelo">
              <Input value={str("deepseek_model")} onChange={(e) => set("deepseek_model", e.target.value)} />
            </Field>
            <Field label="Base URL (OpenAI-compatible)">
              <Input value={str("deepseek_base_url")} onChange={(e) => set("deepseek_base_url", e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleTestLLM} disabled={llmBusy}>
              {llmBusy ? "Probando…" : "Probar conexión"}
            </Button>
            <span className="text-xs text-gray-400">Hace una llamada de prueba (consume crédito).</span>
          </div>
          {llmMsg ? (
            <Alert variant={llmMsg.ok ? "success" : "error"} title={llmMsg.ok ? "Conexión" : "Error de conexión"} message={llmMsg.text} />
          ) : null}
        </ComponentCard>

        {/* ── OCR de imágenes ────────────────────────────────────────── */}
        <ComponentCard title="OCR de imágenes (Instagram)" desc="EasyOCR (red neuronal) para leer precios quemados en los flyers.">
          <div className="flex flex-wrap gap-2">
            <StatusChip ok={!!meta?.easyocr_installed} okText="Paquete easyocr instalado" badText="Falta el paquete easyocr" />
          </div>
          <div>
            <Switch label="Activar OCR de precios en imágenes" defaultChecked={bool("use_vision_price_ocr")} onChange={(c) => set("use_vision_price_ocr", c)} />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Solo Instagram, como último recurso cuando no hay precio en el texto.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Idiomas" help="Separados por comas (p. ej. es,en).">
              <Input value={str("ocr_languages")} onChange={(e) => set("ocr_languages", e.target.value)} />
            </Field>
            <Field label="Imágenes por publicación">
              <Input type="number" min="1" value={str("ocr_max_images_per_post")} onChange={(e) => set("ocr_max_images_per_post", e.target.value)} />
            </Field>
            <Field label="Factor de ampliación" help="Ayuda a captar un '$' pequeño. 1.0 = sin ampliar.">
              <Input type="number" step={0.1} min="1" value={str("ocr_mag_ratio")} onChange={(e) => set("ocr_mag_ratio", e.target.value)} />
            </Field>
            <Field label="Tope número desnudo (USD)" help="Tope de un número sin símbolo de moneda ni contexto.">
              <Input type="number" value={str("ocr_bare_number_max_usd")} onChange={(e) => set("ocr_bare_number_max_usd", e.target.value)} />
            </Field>
          </div>
          <div className="space-y-3">
            <Switch label="Usar GPU (si hay CUDA)" defaultChecked={bool("ocr_use_gpu")} onChange={(c) => set("ocr_use_gpu", c)} />
            <Switch label="Asumir USD para un número sin símbolo" defaultChecked={bool("ocr_assume_usd_for_bare_number")} onChange={(c) => set("ocr_assume_usd_for_bare_number", c)} />
          </div>
        </ComponentCard>

        {/* ── Scrapers + negocio ─────────────────────────────────────── */}
        <ComponentCard title="Scrapers y valores por defecto" desc="Parámetros generales de scraping y defaults de presupuestos.">
          <div>
            <Switch label="Descartar posts de Instagram sin precio" defaultChecked={bool("discard_instagram_without_price")} onChange={(c) => set("discard_instagram_without_price", c)} />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Por defecto se conservan (el precio rara vez está en el caption).</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Límite por scraping">
              <Input type="number" min="1" value={str("scraper_default_limit")} onChange={(e) => set("scraper_default_limit", e.target.value)} />
            </Field>
            <Field label="IVA por defecto (%)" help="Al crear un presupuesto.">
              <Input type="number" step={0.01} value={str("default_iva_pct")} onChange={(e) => set("default_iva_pct", e.target.value)} />
            </Field>
            <Field label="Vigencia de presupuesto (días)" help="0 = sin vencimiento por defecto.">
              <Input type="number" min="0" value={str("default_quote_expiry_days")} onChange={(e) => set("default_quote_expiry_days", e.target.value)} />
            </Field>
          </div>
        </ComponentCard>

      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </>
  );
}
