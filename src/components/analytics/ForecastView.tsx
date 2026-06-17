import { useEffect, useMemo, useState } from "react";
import Select from "../form/Select";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Spinner from "../common/Spinner";
import Alert from "../ui/alert/Alert";
import { ListIcon } from "../../icons";
import ForecastChart, { type ChartKind } from "./ForecastChart";
import ModelMetricsCard from "./ModelMetricsCard";
import ForecastDataModal from "./ForecastDataModal";
import ForecastAdviceCard from "./ForecastAdviceCard";
import { HORIZON_OPTIONS, type ForecastResponse, type ForecastAdviceParams } from "../../services/analyticsService";

interface ForecastViewProps {
  data: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  horizon: number;
  onHorizon: (h: number) => void;
  chartType?: ChartKind;
  showBand?: boolean;
  extraControls?: React.ReactNode;
  yAnnotations?: { y: number; label: string; color?: string }[];
  extraSeries?: { name: string; data: (number | null)[]; color?: string }[];
  logScale?: boolean;
  belowChart?: React.ReactNode;
  emptyHint?: string;
  /** Si se pasa, muestra debajo del gráfico una tarjeta con la lectura del pronóstico
   *  redactada por el LLM. El horizonte actual se inyecta automáticamente. */
  advice?: Omit<ForecastAdviceParams, "horizon">;
}

/**
 * Vista compartida de un pronóstico de serie temporal: barra de controles (controles
 * propios de la página + horizonte + selector de período + botón "Ver datos"), el
 * gráfico, la tarjeta de métricas del modelo y el modal de datos del período.
 */
export default function ForecastView({
  data,
  loading,
  error,
  horizon,
  onHorizon,
  chartType = "area",
  showBand = true,
  extraControls,
  yAnnotations,
  extraSeries,
  logScale = false,
  belowChart,
  emptyHint = "No hay datos suficientes para generar este pronóstico todavía.",
  advice,
}: ForecastViewProps) {
  const allPoints = useMemo(() => [...(data?.history || []), ...(data?.forecast || [])], [data]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Al cambiar los datos, enfoca por defecto el primer mes pronosticado.
  useEffect(() => {
    if (data?.forecast?.length) setSelectedPeriod(data.forecast[0].period);
    else if (data?.history?.length) setSelectedPeriod(data.history[data.history.length - 1].period);
    else setSelectedPeriod(null);
  }, [data]);

  const periodOptions = allPoints.map((p) => ({
    value: p.period,
    label: data?.forecast.some((f) => f.period === p.period) ? `${p.label} (pronóstico)` : p.label,
  }));
  const selectedLabel = allPoints.find((p) => p.period === selectedPeriod)?.label || "—";
  const detail = selectedPeriod && data ? data.detail[selectedPeriod] || null : null;

  const insufficient = data?.meta?.insufficient_data === true;
  const hasData = data && (data.history.length > 0 || data.forecast.length > 0);

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Controles */}
        <div className="mb-5 flex flex-wrap items-end gap-4">
          {extraControls}
          <div className="w-40">
            <Label>Horizonte</Label>
            <Select
              options={HORIZON_OPTIONS}
              defaultValue={String(horizon)}
              onChange={(v) => onHorizon(Number(v))}
            />
          </div>
          <div className="w-52">
            <Label>Período a inspeccionar</Label>
            <Select
              key={`per-${selectedPeriod}-${periodOptions.length}`}
              options={periodOptions}
              defaultValue={selectedPeriod || ""}
              placeholder="Selecciona un mes"
              onChange={setSelectedPeriod}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            startIcon={<ListIcon className="size-4" />}
            disabled={!selectedPeriod || !detail}
            onClick={() => setModalOpen(true)}
          >
            Ver datos
          </Button>
        </div>

        {error && <Alert variant="error" title="Error" message={error} />}

        {loading ? (
          <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Spinner /> Calculando pronóstico…
          </div>
        ) : insufficient || !hasData ? (
          <div className="flex h-72 items-center justify-center px-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {emptyHint}
          </div>
        ) : (
          <ForecastChart
            history={data!.history}
            forecast={data!.forecast}
            valueKind={data!.value_kind}
            unit={data!.unit}
            type={chartType}
            showBand={showBand}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
            yAnnotations={yAnnotations}
            extraSeries={extraSeries}
            logScale={logScale}
          />
        )}

        {belowChart}
      </div>

      {/* Lectura del pronóstico redactada por el LLM (debajo del gráfico) */}
      {advice && (
        <ForecastAdviceCard params={{ ...advice, horizon }} enabled={Boolean(hasData) && !insufficient} />
      )}

      {/* Métricas del modelo */}
      {hasData && !insufficient && (
        <div className="mt-6">
          <ModelMetricsCard model={data!.model} />
        </div>
      )}

      <ForecastDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        periodLabel={selectedLabel}
        detail={detail}
      />
    </>
  );
}
