import { useRef, useState } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Alert from "../ui/alert/Alert";
import Badge from "../ui/badge/Badge";
import Spinner from "../common/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DownloadIcon, FileIcon } from "../../icons";
import {
  dataExchangeService,
  type ImpexEntity,
  type ImportResult,
  type ImportStatus,
} from "../../services/dataExchangeService";
import { getApiError } from "../../services/apiError";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entity: ImpexEntity;
  label: string; // p. ej. "ventas"
  onImported: () => void; // recargar la tabla de la página tras importar
}

const STATUS_META: Record<ImportStatus, { color: "success" | "warning" | "error" | "info"; text: string }> = {
  ok: { color: "success", text: "Válida" },
  created: { color: "success", text: "Importada" },
  duplicate: { color: "warning", text: "Duplicada" },
  error: { color: "error", text: "Error" },
};

export default function ImportModal({ isOpen, onClose, entity, label, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFileName(null);
    setResult(null);
    setCommitted(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const currentFile = () => fileRef.current?.files?.[0] || null;

  const onPickFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setCommitted(false);
    setError(null);
    setBusy(true);
    try {
      const res = await dataExchangeService.preview(entity, file);
      setResult(res);
    } catch (err) {
      setError(getApiError(err, "No se pudo leer el archivo. Verifica que sea la plantilla .xlsx correcta."));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const file = currentFile();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await dataExchangeService.commit(entity, file);
      setResult(res);
      setCommitted(true);
      onImported();
    } catch (err) {
      setError(getApiError(err, "No se pudo completar la importación."));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      await dataExchangeService.downloadTemplate(entity);
    } catch {
      setError("No se pudo descargar la plantilla.");
    }
  };

  const s = result?.summary;
  const importable = !!s && s.ok > 0 && !committed;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="m-4 max-w-3xl">
      <div className="p-6 sm:p-8">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Importar {label} desde Excel
        </h3>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Registra operaciones capturadas mientras el sistema no estaba disponible. Descarga la
          plantilla, complétala y súbela: verás una vista previa antes de confirmar.
        </p>

        {error && (
          <div className="mb-4">
            <Alert variant="error" title="No se pudo procesar" message={error} />
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" startIcon={<DownloadIcon className="size-4" />} onClick={downloadTemplate}>
            Descargar plantilla
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
            }}
          />
          <Button
            variant="primary"
            size="sm"
            startIcon={<FileIcon className="size-4" />}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {fileName ? "Cambiar archivo" : "Seleccionar archivo"}
          </Button>
          {fileName && <span className="text-sm text-gray-600 dark:text-gray-300">{fileName}</span>}
        </div>

        {busy && !result && (
          <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500 dark:text-gray-400">
            <Spinner /> Procesando archivo…
          </div>
        )}

        {s && (
          <>
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              <SummaryPill label="Operaciones" value={s.total} tone="neutral" />
              {committed ? (
                <SummaryPill label="Importadas" value={s.created} tone="success" />
              ) : (
                <SummaryPill label="Válidas" value={s.ok} tone="success" />
              )}
              <SummaryPill label="Duplicadas" value={s.duplicates} tone="warning" />
              <SummaryPill label="Con error" value={s.errors} tone="error" />
            </div>

            {committed && (
              <div className="mb-4">
                <Alert
                  variant={s.errors > 0 ? "warning" : "success"}
                  title="Importación finalizada"
                  message={
                    `Se importaron ${s.created} operación(es).` +
                    (s.duplicates ? ` ${s.duplicates} ya existían (omitidas).` : "") +
                    (s.errors ? ` ${s.errors} con error (revisa el detalle).` : "")
                  }
                />
              </div>
            )}

            <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                  <TableRow>
                    {["Referencia", "Fila(s)", "Estado", "Detalle"].map((h) => (
                      <TableCell key={h} isHeader className="px-4 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {result!.records.map((r, i) => (
                    <TableRow key={`${r.ref}-${i}`}>
                      <TableCell className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-white/90">
                        {r.ref || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{r.rows}</TableCell>
                      <TableCell className="px-4 py-2">
                        <Badge variant="light" color={STATUS_META[r.status].color} size="sm">
                          {STATUS_META[r.status].text}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {r.errors.length > 0 ? (
                          <span className="text-error-500">{r.errors.join(" ")}</span>
                        ) : (
                          r.detail || "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            {committed ? "Cerrar" : "Cancelar"}
          </Button>
          {!committed && (
            <Button onClick={handleImport} disabled={busy || !importable}>
              {busy ? "Importando…" : s ? `Importar ${s.ok} operación(es)` : "Importar"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "error" }) {
  const tones: Record<string, string> = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    success: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    error: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  };
  return (
    <span className={`rounded-full px-3 py-1 font-medium ${tones[tone]}`}>
      {label}: {value}
    </span>
  );
}
