import { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/modal";
import Badge from "../ui/badge/Badge";
import Spinner from "../common/Spinner";
import Alert from "../ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import LineChart from "../stats/LineChart";
import type { BarSeries } from "../stats/BarChart";
import {
  analyticsService,
  type TrainingHistoryResponse,
} from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";

interface TrainingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cambia este valor tras un reentrenamiento para forzar la recarga del historial. */
  refreshKey?: number;
}

// Etiquetas cortas por tipo de modelo para el encabezado de la tabla (el gráfico usa
// el nombre largo). El backend devuelve `display` completo como respaldo.
const SHORT_LABEL: Record<string, string> = {
  SALES: "Ventas",
  PROFIT: "Utilidad",
  DEMAND: "Demanda",
  PRICE: "Precio",
  RATE: "Tasa BCV",
  QUOTE: "Conversión",
  INVENT: "Inventario",
};

const fmt3 = (v: number | null | undefined) =>
  v === null || v === undefined
    ? "—"
    : v.toLocaleString("es-VE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function runLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

/** Variación coloreada respecto al reentrenamiento anterior (mayor = mejor en R²/exactitud). */
function DeltaChip({ d }: { d: number | null }) {
  if (d === null || Math.abs(d) < 0.0005)
    return <span className="text-gray-400 dark:text-gray-500">=</span>;
  const up = d > 0;
  return (
    <span className={up ? "text-success-600" : "text-error-500"}>
      {up ? "▲" : "▼"} {Math.abs(d).toLocaleString("es-VE", { maximumFractionDigits: 3 })}
    </span>
  );
}

/**
 * Modal "Historial de precisión": muestra cómo evoluciona la precisión (R² / exactitud)
 * de cada modelo con cada reentrenamiento. Un gráfico de líneas (una por modelo) sobre el
 * eje de reentrenamientos y una tabla comparativa con la variación respecto a la corrida
 * anterior. Los datos vienen de `TrainingRun` (una instantánea por reentrenamiento).
 */
export default function TrainingHistoryModal({ isOpen, onClose, refreshKey = 0 }: TrainingHistoryModalProps) {
  const [data, setData] = useState<TrainingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);
    analyticsService
      .trainingHistory()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el historial de reentrenamientos.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isOpen, refreshKey]);

  const runs = data?.runs ?? [];
  const models = data?.models ?? [];

  // Serie por modelo alineada al eje de reentrenamientos (índice 1..N).
  const categories = useMemo(() => runs.map((r) => runLabel(r.trained_at)), [runs]);
  const series: BarSeries[] = useMemo(
    () =>
      models.map((m) => {
        const arr: (number | null)[] = runs.map(() => null);
        m.points.forEach((p) => {
          if (p.index >= 1 && p.index <= arr.length) arr[p.index - 1] = p.value;
        });
        return { name: m.display, data: arr as number[] };
      }),
    [models, runs]
  );

  // Mapa {run_id -> {model_type -> {value, delta vs. corrida anterior}}} para la tabla.
  const cellMap = useMemo(() => {
    const out: Record<number, Record<string, { value: number | null; delta: number | null }>> = {};
    models.forEach((m) => {
      m.points.forEach((p, i) => {
        const prev = i > 0 ? m.points[i - 1].value : null;
        const delta = p.value !== null && prev !== null ? p.value - prev : null;
        (out[p.run_id] ??= {})[m.model_type] = { value: p.value, delta };
      });
    });
    return out;
  }, [models]);

  const rowsNewestFirst = useMemo(() => [...runs].reverse(), [runs]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-5xl">
      <div className="p-6">
        <div className="mb-1 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Historial de precisión de los modelos
          </h3>
          {runs.length > 0 && (
            <Badge variant="light" color="info" size="sm">
              {runs.length} reentrenamiento{runs.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Evolución de la precisión de cada modelo con cada reentrenamiento. Se compara{" "}
          <strong>R²</strong> (modelos de regresión) y <strong>exactitud</strong> (conversión de
          presupuestos); en ambas, mayor es mejor.
        </p>

        {error && <Alert variant="error" title="Error" message={error} />}

        {loading ? (
          <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Spinner /> Cargando historial…
          </div>
        ) : runs.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Aún no hay historial de reentrenamientos. Cada vez que reentrenes los modelos se
            registrará aquí un punto para comparar la evolución de su precisión.
          </p>
        ) : (
          <>
            {/* Gráfico de evolución */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <LineChart
                categories={categories}
                series={series}
                type="line"
                height={320}
                showLegend
                valueFormatter={(v) => v.toLocaleString("es-VE", { maximumFractionDigits: 3 })}
              />
            </div>

            {/* Tabla comparativa (más reciente arriba; Δ vs. corrida anterior) */}
            <div className="mt-5 max-h-[45vh] max-w-full overflow-auto custom-scrollbar rounded-2xl border border-gray-200 dark:border-gray-800">
              <Table>
                <TableHeader className="sticky top-0 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      Reentrenamiento
                    </TableCell>
                    {models.map((m) => (
                      <TableCell
                        key={m.model_type}
                        isHeader
                        className="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        <span title={m.display}>{SHORT_LABEL[m.model_type] || m.display}</span>
                        <span className="ml-1 text-gray-400">({m.metric_label})</span>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rowsNewestFirst.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">#{run.index}</span>
                          <Badge variant="light" color={run.trigger === "UI" ? "primary" : "light"} size="sm">
                            {run.trigger === "UI" ? "Panel" : "Comando"}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          {runLabel(run.trained_at)}
                          {run.triggered_by ? ` · ${run.triggered_by}` : ""}
                        </div>
                      </TableCell>
                      {models.map((m) => {
                        const cell = cellMap[run.id]?.[m.model_type];
                        return (
                          <TableCell key={m.model_type} className="px-4 py-2.5 text-sm">
                            <div className="font-medium text-gray-800 dark:text-white/90">
                              {fmt3(cell?.value ?? null)}
                            </div>
                            <div className="mt-0.5 text-xs">
                              <DeltaChip d={cell?.delta ?? null} />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              La variación (▲/▼) se calcula contra el reentrenamiento inmediatamente anterior.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
