import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";
import type { DashboardStats } from "../../services/statsService";
import { fmtCompactUSD, fmtInt, fmtPct } from "../../utils/format";

/**
 * Avance del mes frente a la "meta" = promedio de ingresos de los meses
 * anteriores de la ventana. Datos reales de `/stats/dashboard`.
 */
export default function MonthlyTarget({ kpis, referenceLabel }: {
  kpis: DashboardStats["kpis"];
  referenceLabel: string;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const pct = kpis.target_pct ?? 0;
  const growth = kpis.revenue_growth_pct;
  const up = (growth ?? 0) >= 0;

  const series = [Math.max(0, Math.min(pct, 100))];
  const options: ApexOptions = {
    colors: ["#465FFF"],
    chart: { fontFamily: "Outfit, sans-serif", type: "radialBar", height: 330, sparkline: { enabled: true } },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "80%" },
        track: { background: dark ? "#1d2939" : "#E4E7EC", strokeWidth: "100%", margin: 5 },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: dark ? "#e4e7ec" : "#1D2939",
            // Muestra el avance real (puede superar 100%) aunque el arco se llene al 100%.
            formatter: () => fmtPct(pct, 0),
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#465FFF"] },
    stroke: { lineCap: "round" },
    labels: ["Avance"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Meta mensual</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ingresos de {referenceLabel} vs. el promedio reciente
          </p>
        </div>
        <div className="relative">
          <div className="max-h-[330px]">
            <Chart options={options} series={series} type="radialBar" height={330} />
          </div>
          {growth !== null && growth !== undefined && (
            <span
              className={`absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full px-3 py-1 text-xs font-medium ${
                up
                  ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500"
                  : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
              }`}
            >
              {up ? "+" : ""}
              {fmtPct(growth)}
            </span>
          )}
        </div>
        <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base dark:text-gray-400">
          Este mes llevas {fmtCompactUSD(kpis.revenue_month)} en ingresos
          {growth !== null && growth !== undefined
            ? `, ${up ? "más" : "menos"} que el mes pasado (${fmtPct(Math.abs(growth))}).`
            : "."}
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Meta</p>
          <p className="text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmtCompactUSD(kpis.target_month)}
          </p>
        </div>
        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800"></div>
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Ingresos</p>
          <p className="text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmtCompactUSD(kpis.revenue_month)}
          </p>
        </div>
        <div className="h-7 w-px bg-gray-200 dark:bg-gray-800"></div>
        <div>
          <p className="mb-1 text-center text-gray-500 text-theme-xs dark:text-gray-400 sm:text-sm">Ventas</p>
          <p className="text-center text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
            {fmtInt(kpis.sales_count_month)}
          </p>
        </div>
      </div>
    </div>
  );
}
