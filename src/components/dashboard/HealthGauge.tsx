import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { HealthIndex } from "../../services/statsService";

/**
 * Índice de Ventaja Competitiva (IVC) — el "North Star" del panel. Es un score
 * 0-100 construido de forma TRANSPARENTE: media ponderada de sub-métricas reales
 * (rentabilidad, crecimiento, conversión, retención, salud de inventario y
 * competitividad de precio frente al mercado scrapeado). Cada componente y su peso
 * se muestran debajo del medidor, así que el número es auditable, no una caja negra.
 */

const STATUS = {
  good: { color: "#12b76a", label: "Saludable", text: "text-success-600 dark:text-success-500" },
  warn: { color: "#f79009", label: "En vigilancia", text: "text-warning-600 dark:text-orange-400" },
  bad: { color: "#f04438", label: "En riesgo", text: "text-error-600 dark:text-error-500" },
} as const;

export default function HealthGauge({ data }: { data: HealthIndex }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const status = STATUS[data.status];

  const options: ApexOptions = {
    colors: [status.color],
    chart: { fontFamily: "Outfit, sans-serif", type: "radialBar", sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -120,
        endAngle: 120,
        hollow: { size: "62%" },
        track: { background: dark ? "#1d2939" : "#E4E7EC", strokeWidth: "100%" },
        dataLabels: {
          name: { show: true, offsetY: 22, color: dark ? "#98a2b3" : "#667085", fontSize: "12px" },
          value: {
            fontSize: "34px",
            fontWeight: "700",
            offsetY: -12,
            color: dark ? "#e4e7ec" : "#1D2939",
            formatter: (v) => `${Math.round(Number(v))}`,
          },
        },
      },
    },
    fill: { type: "solid", colors: [status.color] },
    stroke: { lineCap: "round" },
    labels: ["/ 100"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Índice de Ventaja Competitiva</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Salud global del negocio (IVC)</p>
        </div>
        <span className={`rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold dark:bg-white/10 ${status.text}`}>
          {status.label}
        </span>
      </div>

      <div className="mx-auto max-h-[220px] max-w-[260px]">
        <Chart options={options} series={[Math.max(0, Math.min(data.score, 100))]} type="radialBar" height={220} />
      </div>

      <div className="mt-3 space-y-2.5">
        {data.components.map((c) => (
          <div key={c.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-300">
                {c.label} <span className="text-gray-400">· {c.detail}</span>
              </span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{Math.round(c.score)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(c.score, 100))}%`,
                  backgroundColor: c.score >= 70 ? "#12b76a" : c.score >= 45 ? "#f79009" : "#f04438",
                }}
              />
            </div>
            <span className="mt-0.5 block text-[10px] text-gray-400">Peso {Math.round(c.weight * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
