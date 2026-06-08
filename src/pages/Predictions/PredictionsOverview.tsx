import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Spinner from "../../components/common/Spinner";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { analyticsService, type OverviewResponse } from "../../services/analyticsService";
import { getApiError } from "../../services/apiError";
import { fmtUSD, fmtDate } from "../../utils/format";

function Headline({ label, value, sub, to }: { label: string; value: string; sub?: string; to?: string }) {
  const inner = (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

const fmtN = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("es-VE", { maximumFractionDigits: d });

export default function PredictionsOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    analyticsService
      .overview()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(getApiError(e, "No se pudo cargar el panel predictivo.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const h = data?.headlines;

  return (
    <>
      <PageMeta title="Panel predictivo" description="Resumen de pronósticos y modelos" />
      <PageBreadcrumb pageTitle="Panel predictivo" />
      <p className="mb-5 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Resumen de los modelos de Machine Learning del sistema. Cada tarjeta enlaza a su pronóstico detallado, con
        gráficos interactivos y el detalle de los datos por período.
      </p>

      {error && <Alert variant="error" title="Error" message={error} />}

      {loading ? (
        <div className="flex h-72 items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Spinner /> Cargando panel…
        </div>
      ) : !data ? null : (
        <>
          {/* Titulares */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Headline
              label="Ingresos próximo mes"
              value={h?.next_revenue ? fmtUSD(h.next_revenue.value) : "—"}
              sub={h?.next_revenue ? h.next_revenue.label : undefined}
              to="/predicciones/ventas"
            />
            <Headline
              label="Tasa BCV próximo mes"
              value={h?.next_bcv ? `${fmtN(h.next_bcv.value)} Bs` : "—"}
              sub={h?.next_bcv ? h.next_bcv.label : undefined}
              to="/predicciones/tasa-cambio"
            />
            <Headline
              label="Pipeline esperado"
              value={h?.pipeline ? fmtUSD(h.pipeline.expected_revenue_usd) : "—"}
              sub={h?.pipeline ? `${h.pipeline.open_count} presupuestos · ${h.pipeline.expected_rate_pct}% conversión` : undefined}
              to="/predicciones/presupuestos"
            />
            <Headline
              label="Conversión histórica"
              value={h?.quote_conversion_rate != null ? `${h.quote_conversion_rate}%` : "—"}
              sub="presupuestos cerrados"
              to="/predicciones/presupuestos"
            />
          </div>

          {/* Alertas de reabastecimiento */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">Alertas de reabastecimiento</h4>
              <Link to="/predicciones/inventario" className="text-sm font-medium text-brand-500 hover:text-brand-600">
                Ver inventario
              </Link>
            </div>
            {data.restock_alerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Ningún producto destacado necesita reabastecimiento en el horizonte.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Producto", "Stock actual", "Punto de reorden", "Reposición sugerida", "Agotamiento"].map((c) => (
                        <TableCell key={c} isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">{c}</TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.restock_alerts.map((a) => (
                      <TableRow key={a.product_id}>
                        <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{a.product_name || `#${a.product_id}`}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{a.current_stock}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{a.reorder_point}</TableCell>
                        <TableCell className="px-3 py-2.5 text-sm font-semibold text-warning-600">{a.suggested_reorder_qty}</TableCell>
                        <TableCell className="px-3 py-2.5">
                          <Badge variant="light" color={a.stockout_label ? "warning" : "success"} size="sm">
                            {a.stockout_label || "Sin riesgo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Registro de modelos */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-200">Registro de modelos activos</h4>
            {data.registry.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay modelos registrados. Ejecuta <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">python manage.py train_models</code>.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      {["Pronóstico", "Modelo", "R² / Exactitud", "RMSE", "MAE", "Entrenado"].map((c) => (
                        <TableCell key={c} isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">{c}</TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.registry.map((r) => {
                      const acc = (r.metrics as { accuracy?: number })?.accuracy;
                      return (
                        <TableRow key={r.name}>
                          <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">{r.model_type_display}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{r.name.split("_").pop()}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{r.r2 != null ? fmtN(r.r2, 3) : acc != null ? fmtN(acc, 3) : "—"}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtN(r.rmse)}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtN(r.mae)}</TableCell>
                          <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">{fmtDate(r.trained_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
