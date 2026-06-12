// Documento PDF ejecutivo (máx. 5 páginas) construido con react-pdf. Es función pura
// de sus props (NO usa contextos de React: se renderiza en el reconciler de react-pdf,
// fuera del árbol de la app). Cubre situación actual, desempeño, riesgos, estimaciones
// y acciones sugeridas, en lenguaje simple para el dueño/CEO.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ExecutiveDashboard } from "../../services/statsService";
import type { OverviewResponse, ForecastResponse } from "../../services/analyticsService";
import { fmtUSD, fmtCompactUSD, fmtInt, fmtPct, fmtDate } from "../../utils/format";
import {
  buildSituation,
  buildRisks,
  buildActions,
  buildEstimations,
  forecastSeries,
  isSensitive,
  signedPct,
  type Severity,
} from "./reportContent";
import { VBars, HBars, StackBar, LineChartPdf, GaugeBar, Legend, palette, SERIES_COLORS } from "./charts";

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 40, paddingHorizontal: 32, fontSize: 9, color: palette.body, fontFamily: "Helvetica" },
  cover: { backgroundColor: palette.brand, borderRadius: 8, padding: 18, marginBottom: 14 },
  coverKicker: { color: "#c7d2fe", fontSize: 9, fontWeight: "bold", letterSpacing: 1 },
  coverTitle: { color: "#ffffff", fontSize: 22, fontWeight: "bold", marginTop: 4 },
  coverSub: { color: "#e0e7ff", fontSize: 9.5, marginTop: 3 },
  coverMetaRow: { flexDirection: "row", marginTop: 12 },
  coverMetaBox: { marginRight: 22 },
  coverMetaLabel: { color: "#c7d2fe", fontSize: 7.5 },
  coverMetaValue: { color: "#ffffff", fontSize: 9.5, fontWeight: "bold", marginTop: 1 },

  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: palette.grid },
  pageHeaderTitle: { fontSize: 8, color: palette.muted },
  pageHeaderBrand: { fontSize: 8, fontWeight: "bold", color: palette.brand },

  secTitle: { fontSize: 13, fontWeight: "bold", color: palette.ink, marginBottom: 2 },
  secSub: { fontSize: 8.5, color: palette.muted, marginBottom: 8 },
  block: { marginBottom: 12 },

  paragraph: { fontSize: 9.5, color: palette.body, lineHeight: 1.45, marginBottom: 6 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: palette.brand, marginTop: 4, marginRight: 6 },
  bulletText: { fontSize: 9, color: palette.body, lineHeight: 1.4, flex: 1 },

  card: { borderWidth: 1, borderColor: palette.grid, borderRadius: 6, padding: 8 },
  cardLabel: { fontSize: 7.5, color: palette.muted },
  cardValue: { fontSize: 13, fontWeight: "bold", color: palette.ink, marginTop: 2 },
  cardDelta: { fontSize: 7.5, marginTop: 1 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  kpiCard: { width: "32%", borderWidth: 1, borderColor: palette.grid, borderRadius: 6, padding: 7, marginBottom: 7 },

  chartRow: { flexDirection: "row", justifyContent: "space-between" },
  chartCol: { width: "48.5%", borderWidth: 1, borderColor: palette.grid, borderRadius: 6, padding: 9, marginBottom: 11 },
  chartTitle: { fontSize: 9.5, fontWeight: "bold", color: palette.ink, marginBottom: 1 },
  chartCaption: { fontSize: 7.5, color: palette.muted, marginTop: 5, lineHeight: 1.35 },

  riskItem: { flexDirection: "row", borderLeftWidth: 3, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 6 },
  riskTitle: { fontSize: 9.5, fontWeight: "bold", color: palette.ink },
  riskText: { fontSize: 8.5, color: palette.body, lineHeight: 1.4, marginTop: 1 },
  badge: { fontSize: 6.5, fontWeight: "bold", paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3, marginLeft: "auto" },

  actionItem: { flexDirection: "row", marginBottom: 8 },
  actionNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: palette.brand, color: "#fff", fontSize: 9, fontWeight: "bold", textAlign: "center", paddingTop: 2.5, marginRight: 8 },
  actionTitle: { fontSize: 9.5, fontWeight: "bold", color: palette.ink },
  actionText: { fontSize: 8.5, color: palette.body, lineHeight: 1.4, marginTop: 1 },

  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: palette.grid, paddingBottom: 3, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#f2f4f7" },
  th: { fontSize: 7.5, fontWeight: "bold", color: palette.muted },
  td: { fontSize: 8, color: palette.body },

  estItem: { width: "48.5%", borderWidth: 1, borderColor: palette.grid, borderRadius: 6, padding: 8, marginBottom: 8 },
  estLabel: { fontSize: 7.5, color: palette.muted },
  estValue: { fontSize: 13, fontWeight: "bold", color: palette.ink, marginTop: 2 },
  estSub: { fontSize: 7.5, color: palette.body, marginTop: 2, lineHeight: 1.35 },

  pills: { flexDirection: "row", justifyContent: "space-between" },
  pill: { width: "32%", borderRadius: 6, padding: 7, alignItems: "center" },
  pillValue: { fontSize: 14, fontWeight: "bold" },
  pillLabel: { fontSize: 7.5, marginTop: 1 },

  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: palette.grid, paddingTop: 5 },
  footerText: { fontSize: 7, color: palette.muted },
});

const SEV_STYLE: Record<Severity, { border: string; bg: string; badgeBg: string; badgeColor: string; label: string }> = {
  high: { border: palette.red, bg: "#fef3f2", badgeBg: "#fee4e2", badgeColor: "#b42318", label: "ALTO" },
  medium: { border: palette.amber, bg: "#fffaeb", badgeBg: "#fef0c7", badgeColor: "#b54708", label: "MEDIO" },
  low: { border: palette.brand, bg: "#eff4ff", badgeBg: "#d1e0ff", badgeColor: "#3538cd", label: "BAJO" },
};

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text style={styles.pageHeaderTitle}>{title}</Text>
      <Text style={styles.pageHeaderBrand}>Maescar · Reporte Ejecutivo</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Inversiones Maescar C.A. · Documento confidencial</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function ChartBox({ title, children, caption }: { title: string; children: React.ReactNode; caption?: string }) {
  return (
    <View style={styles.chartCol}>
      <Text style={styles.chartTitle}>{title}</Text>
      {children}
      {caption ? <Text style={styles.chartCaption}>{caption}</Text> : null}
    </View>
  );
}

interface Kpi {
  label: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
}

function buildKpis(d: ExecutiveDashboard): Kpi[] {
  const k = d.kpis;
  const conv = k.conversion_rate == null ? null : k.conversion_rate <= 1 ? k.conversion_rate * 100 : k.conversion_rate;
  const list: Kpi[] = [
    { label: "Ingresos", value: fmtUSD(k.revenue), delta: k.revenue_delta_pct },
  ];
  if (k.profit !== undefined) list.push({ label: "Utilidad", value: fmtUSD(k.profit), delta: k.profit_delta_pct });
  if (k.margin_pct != null) list.push({ label: "Margen", value: fmtPct(k.margin_pct), delta: k.margin_delta_pts, deltaSuffix: " pts" });
  list.push({ label: "Ventas", value: fmtInt(k.sales_count), delta: k.sales_count_delta_pct });
  list.push({ label: "Ticket promedio", value: fmtUSD(k.avg_ticket), delta: k.avg_ticket_delta_pct });
  list.push({ label: "Unidades vendidas", value: fmtInt(k.units_sold), delta: k.units_delta_pct });
  list.push({ label: "Clientes activos", value: fmtInt(k.active_customers), delta: k.active_customers_delta_pct });
  if (conv != null) list.push({ label: "Conversión", value: fmtPct(conv) });
  if (k.retention_pct != null) list.push({ label: "Retención", value: fmtPct(k.retention_pct) });
  return list;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const up = (kpi.delta ?? 0) >= 0;
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.cardLabel}>{kpi.label}</Text>
      <Text style={styles.cardValue}>{kpi.value}</Text>
      {kpi.delta != null && !Number.isNaN(kpi.delta) ? (
        <Text style={[styles.cardDelta, { color: up ? palette.green : palette.red }]}>
          {kpi.deltaSuffix ? `${signedPct(kpi.delta).replace("%", "")}${kpi.deltaSuffix}` : signedPct(kpi.delta)} vs. periodo previo
        </Text>
      ) : (
        <Text style={[styles.cardDelta, { color: palette.muted }]}>—</Text>
      )}
    </View>
  );
}

export interface ReportDocumentProps {
  data: ExecutiveDashboard;
  overview: OverviewResponse | null;
  revenueForecast: ForecastResponse | null;
  generatedAt: Date;
  userName?: string;
}

export default function ReportDocument({ data, overview, revenueForecast, generatedAt, userName }: ReportDocumentProps) {
  const sensitive = isSensitive(data);
  const kpis = buildKpis(data);
  const situation = buildSituation(data);
  const risks = buildRisks(data);
  const actions = buildActions(data, overview);
  const estimations = buildEstimations(data, overview);
  const inv = data.inventory_health;
  const rangeLabel = `${data.range.from_label} – ${data.range.to_label}`;

  // --- datos de gráficos ---
  const monthLabels = data.monthly.map((m) => m.label);
  const revenueSeries = [
    { name: "Ingresos", color: palette.brand, data: data.monthly.map((m) => Math.round(m.revenue)) },
    ...(sensitive ? [{ name: "Utilidad", color: palette.green, data: data.monthly.map((m) => Math.round(m.profit ?? 0)) }] : []),
  ];
  const typeSplitSeg = data.type_split.map((t, i) => ({
    label: t.label,
    value: Math.round(t.revenue),
    color: /detal/i.test(t.label) ? palette.amber : /institu/i.test(t.label) ? palette.brand : SERIES_COLORS[i % SERIES_COLORS.length],
  }));
  const catItems = data.revenue_by_category.slice(0, 6).map((c) => ({ label: c.category, value: Math.round(c.revenue) }));
  const typeTrendLabels = data.monthly_by_type.map((m) => m.label);
  const typeTrendSeries = [
    { name: "Detal", color: palette.amber, data: data.monthly_by_type.map((m) => Math.round(m.retail)) as (number | null)[] },
    { name: "Institucional", color: palette.brand, data: data.monthly_by_type.map((m) => Math.round(m.institutional)) as (number | null)[] },
  ];
  const fc = revenueForecast ? forecastSeries(revenueForecast) : null;

  return (
    <Document title={`Reporte Ejecutivo Maescar — ${rangeLabel}`} author="Sistema Predictivo Maescar" subject="Resumen ejecutivo">
      {/* ============ PÁGINA 1 — Situación actual ============ */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverKicker}>INVERSIONES MAESCAR C.A.</Text>
          <Text style={styles.coverTitle}>Reporte Ejecutivo</Text>
          <Text style={styles.coverSub}>Sistema Predictivo · Panorama del negocio y lo que viene</Text>
          <View style={styles.coverMetaRow}>
            <View style={styles.coverMetaBox}>
              <Text style={styles.coverMetaLabel}>PERIODO ANALIZADO</Text>
              <Text style={styles.coverMetaValue}>{rangeLabel}</Text>
            </View>
            <View style={styles.coverMetaBox}>
              <Text style={styles.coverMetaLabel}>GENERADO</Text>
              <Text style={styles.coverMetaValue}>{fmtDate(generatedAt.toISOString())}</Text>
            </View>
            {userName ? (
              <View style={styles.coverMetaBox}>
                <Text style={styles.coverMetaLabel}>POR</Text>
                <Text style={styles.coverMetaValue}>{userName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.secTitle}>Situación actual</Text>
          <Text style={styles.secSub}>Dónde está el negocio hoy, en términos simples</Text>
          <Text style={styles.paragraph}>{situation}</Text>
          {data.narrative.slice(0, 5).map((s, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{s}</Text>
            </View>
          ))}
        </View>

        {data.health_index ? (
          <View style={styles.block}>
            <Text style={styles.secTitle}>Salud global del negocio (IVC)</Text>
            <Text style={styles.secSub}>
              Índice de Ventaja Competitiva: un puntaje 0-100 que combina rentabilidad, crecimiento, conversión,
              retención, inventario y competitividad de precio
            </Text>
            <View style={{ marginBottom: 8 }}>
              <GaugeBar
                score={data.health_index.score}
                color={data.health_index.status === "good" ? palette.green : data.health_index.status === "warn" ? palette.amber : palette.red}
                label={data.health_index.status === "good" ? "Saludable" : data.health_index.status === "warn" ? "En vigilancia" : "En riesgo"}
              />
            </View>
            <HBars
              items={data.health_index.components.map((c) => ({
                label: c.label,
                value: Math.round(c.score),
                color: c.score >= 70 ? palette.green : c.score >= 45 ? palette.amber : palette.red,
              }))}
              valueFmt={(n) => `${n}/100`}
              labelWidth={150}
            />
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.secTitle}>Indicadores clave</Text>
          <Text style={styles.secSub}>Comparados con el periodo inmediatamente anterior de igual duración</Text>
          <View style={styles.kpiGrid}>
            {kpis.map((k, i) => (
              <KpiCard key={i} kpi={k} />
            ))}
          </View>
        </View>

        <Footer />
      </Page>

      {/* ============ PÁGINA 2 — Desempeño ============ */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Desempeño del periodo" />
        <Text style={styles.secTitle}>¿Cómo se está moviendo el negocio?</Text>
        <Text style={styles.secSub}>Evolución de ingresos, mezcla de clientes y categorías más vendidas</Text>

        <View style={styles.chartRow}>
          <ChartBox
            title={sensitive ? "Ingresos y utilidad por mes" : "Ingresos por mes"}
            caption="Las barras muestran cuánto entró cada mes dentro del periodo. Permite ver si la facturación crece, se mantiene o cae."
          >
            <VBars labels={monthLabels} series={revenueSeries} valueFmt={fmtCompactUSD} height={130} />
            <Legend items={revenueSeries.map((s) => ({ label: s.name, color: s.color }))} />
          </ChartBox>
          <ChartBox
            title="Composición de ingresos"
            caption="Qué parte de las ventas viene del detal (clientes pequeños) y qué parte del segmento institucional/proyectos."
          >
            <StackBar segments={typeSplitSeg} valueFmt={fmtCompactUSD} />
          </ChartBox>
        </View>

        <View style={styles.chartRow}>
          <ChartBox
            title="Detal vs. institucional (tendencia)"
            caption="La historia estratégica: el detal tiende a estancarse mientras lo institucional sostiene el negocio."
          >
            <LineChartPdf labels={typeTrendLabels} series={typeTrendSeries} width={235} height={120} />
            <Legend items={typeTrendSeries.map((s) => ({ label: s.name, color: s.color }))} />
          </ChartBox>
          <ChartBox
            title="Ingresos por categoría"
            caption="Las categorías que más facturan en el periodo. Concentrar esfuerzo en las de arriba suele rendir más."
          >
            <HBars items={catItems} valueFmt={fmtCompactUSD} labelWidth={90} />
          </ChartBox>
        </View>

        <Footer />
      </Page>

      {/* ============ PÁGINA 3 — Riesgos y preocupaciones ============ */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Riesgos y preocupaciones" />
        <Text style={styles.secTitle}>Preocupaciones y riesgos</Text>
        <Text style={styles.secSub}>Lo que conviene vigilar, ordenado por importancia, y por qué importa</Text>

        <View style={styles.block}>
          {risks.length === 0 ? (
            <Text style={styles.paragraph}>No se detectaron riesgos relevantes en el periodo: el negocio opera dentro de lo esperado.</Text>
          ) : (
            risks.map((r, i) => {
              const s = SEV_STYLE[r.severity];
              return (
                <View key={i} style={[styles.riskItem, { borderLeftColor: s.border, backgroundColor: s.bg }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={styles.riskTitle}>{r.title}</Text>
                      <Text style={[styles.badge, { backgroundColor: s.badgeBg, color: s.badgeColor }]}>{s.label}</Text>
                    </View>
                    <Text style={styles.riskText}>{r.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.chartRow}>
          <View style={{ width: "55%" }}>
            <Text style={styles.chartTitle}>Capital inmovilizado (sin demanda)</Text>
            <Text style={styles.secSub}>{fmtInt(data.no_demand_count)} producto(s) sin ventas en el periodo</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Producto</Text>
              <Text style={[styles.th, { width: 40, textAlign: "right" }]}>Stock</Text>
              <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Valor</Text>
            </View>
            {data.no_demand.slice(0, 6).map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{p.name}</Text>
                <Text style={[styles.td, { width: 40, textAlign: "right" }]}>{fmtInt(p.stock)}</Text>
                <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{fmtUSD(p.retail_value)}</Text>
              </View>
            ))}
            {data.no_demand.length === 0 ? <Text style={styles.td}>Todos los productos activos vendieron en el periodo.</Text> : null}
          </View>
          <View style={{ width: "42%" }}>
            <Text style={styles.chartTitle}>Clientes en riesgo de fuga</Text>
            <Text style={styles.secSub}>Sin comprar en más de 6 meses</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Cliente</Text>
              <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Histórico</Text>
            </View>
            {data.at_risk.slice(0, 6).map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{c.name}</Text>
                <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{fmtUSD(c.revenue)}</Text>
              </View>
            ))}
            {data.at_risk.length === 0 ? <Text style={styles.td}>Sin clientes en riesgo en el periodo.</Text> : null}
          </View>
        </View>

        <View style={[styles.block, { marginTop: 12 }]}>
          <Text style={styles.chartTitle}>Salud del inventario (estado actual)</Text>
          <View style={[styles.pills, { marginTop: 6 }]}>
            <View style={[styles.pill, { backgroundColor: "#ecfdf3" }]}>
              <Text style={[styles.pillValue, { color: palette.green }]}>{fmtInt(inv.ok_stock)}</Text>
              <Text style={[styles.pillLabel, { color: palette.green }]}>Con stock</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: "#fffaeb" }]}>
              <Text style={[styles.pillValue, { color: palette.amber }]}>{fmtInt(inv.low_stock)}</Text>
              <Text style={[styles.pillLabel, { color: palette.amber }]}>Stock bajo</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: "#fef3f2" }]}>
              <Text style={[styles.pillValue, { color: palette.red }]}>{fmtInt(inv.out_of_stock)}</Text>
              <Text style={[styles.pillLabel, { color: palette.red }]}>Sin stock</Text>
            </View>
          </View>
          <Text style={styles.chartCaption}>
            Inventario valorado en {fmtUSD(inv.inventory_retail_usd)} a precio de venta ({fmtInt(inv.units_in_stock)} unidades).
            Mantener stock de lo que rota y liberar lo que no, libera caja.
          </Text>
        </View>

        <Footer />
      </Page>

      {/* ============ PÁGINA 4 — Estimaciones (solo si hay pronósticos) ============ */}
      {overview ? (
        <Page size="A4" style={styles.page}>
          <PageHeader title="Estimaciones — lo que viene" />
          <Text style={styles.secTitle}>¿Qué se espera en los próximos meses?</Text>
          <Text style={styles.secSub}>Proyecciones de los modelos predictivos (apoyo a la decisión, no certezas)</Text>
          <Text style={styles.paragraph}>{estimations.intro}</Text>

          {fc ? (
            <View style={[styles.chartCol, { width: "100%" }]}>
              <Text style={styles.chartTitle}>Proyección de ingresos</Text>
              <LineChartPdf
                labels={fc.labels}
                series={[
                  { name: "Histórico", color: palette.brand, data: fc.history },
                  { name: "Pronóstico", color: palette.violet, data: fc.forecast, dashed: true },
                ]}
                width={500}
                height={150}
                divider={fc.divider}
              />
              <Legend
                items={[
                  { label: "Histórico (real)", color: palette.brand },
                  { label: "Pronóstico (estimado)", color: palette.violet },
                ]}
              />
              <Text style={styles.chartCaption}>
                La línea sólida es lo ya ocurrido; la punteada, lo que el modelo proyecta. La línea vertical marca el
                límite entre el pasado y el futuro estimado.
              </Text>
            </View>
          ) : null}

          <View style={[styles.chartRow, { flexWrap: "wrap", marginTop: 4 }]}>
            {estimations.items.map((it, i) => (
              <View key={i} style={styles.estItem}>
                <Text style={styles.estLabel}>{it.label}</Text>
                <Text style={styles.estValue}>{it.value}</Text>
                {it.sub ? <Text style={styles.estSub}>{it.sub}</Text> : null}
              </View>
            ))}
          </View>

          <Footer />
        </Page>
      ) : null}

      {/* ============ PÁGINA 5 — Acciones sugeridas + cierre ============ */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Acciones sugeridas" />
        <Text style={styles.secTitle}>Acciones sugeridas</Text>
        <Text style={styles.secSub}>Pasos concretos para atacar los riesgos y aprovechar las oportunidades</Text>

        <View style={styles.block}>
          {actions.map((a, i) => (
            <View key={i} style={styles.actionItem}>
              <Text style={styles.actionNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{a.title}</Text>
                <Text style={styles.actionText}>{a.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.chartRow}>
          <View style={{ width: "48.5%" }}>
            <Text style={styles.chartTitle}>Productos más vendidos</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Producto</Text>
              <Text style={[styles.th, { width: 36, textAlign: "right" }]}>Uds.</Text>
              <Text style={[styles.th, { width: 56, textAlign: "right" }]}>Ingresos</Text>
            </View>
            {data.top_products.slice(0, 5).map((p, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{p.name}</Text>
                <Text style={[styles.td, { width: 36, textAlign: "right" }]}>{fmtInt(p.units)}</Text>
                <Text style={[styles.td, { width: 56, textAlign: "right" }]}>{fmtUSD(p.revenue)}</Text>
              </View>
            ))}
          </View>
          <View style={{ width: "48.5%" }}>
            <Text style={styles.chartTitle}>Mejores clientes</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Cliente</Text>
              <Text style={[styles.th, { width: 36, textAlign: "right" }]}>Ped.</Text>
              <Text style={[styles.th, { width: 56, textAlign: "right" }]}>Ingresos</Text>
            </View>
            {data.top_customers.slice(0, 5).map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1 }]}>{c.name}</Text>
                <Text style={[styles.td, { width: 36, textAlign: "right" }]}>{fmtInt(c.orders)}</Text>
                <Text style={[styles.td, { width: 56, textAlign: "right" }]}>{fmtUSD(c.revenue)}</Text>
              </View>
            ))}
          </View>
        </View>

        {sensitive && data.competitive && data.competitive.positioning.some((p) => p.own_avg != null) ? (
          <View style={[styles.block, { marginTop: 12 }]}>
            <Text style={styles.chartTitle}>Posición competitiva (precio propio vs. mercado)</Text>
            {data.competitive.price_score != null ? (
              <Text style={styles.secSub}>
                Competitividad de precio: {Math.round(data.competitive.price_score)}/100 (0 = mucho más caro · 100 = mucho más barato)
              </Text>
            ) : null}
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Categoría</Text>
              <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Propio</Text>
              <Text style={[styles.th, { width: 60, textAlign: "right" }]}>Mercado</Text>
              <Text style={[styles.th, { width: 64, textAlign: "right" }]}>Posición</Text>
            </View>
            {data.competitive.positioning
              .filter((p) => p.own_avg != null)
              .slice(0, 5)
              .map((p, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 1 }]}>{p.category}</Text>
                  <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{fmtUSD(p.own_avg)}</Text>
                  <Text style={[styles.td, { width: 60, textAlign: "right" }]}>{fmtUSD(p.comp_avg)}</Text>
                  <Text
                    style={[
                      styles.td,
                      { width: 64, textAlign: "right", color: p.position === "above" ? palette.red : p.position === "below" ? palette.green : palette.amber },
                    ]}
                  >
                    {p.position === "above" ? "Por encima" : p.position === "below" ? "Por debajo" : p.position === "within" ? "En rango" : "—"}
                  </Text>
                </View>
              ))}
          </View>
        ) : null}

        <View style={[styles.block, { marginTop: 14, borderTopWidth: 1, borderTopColor: palette.grid, paddingTop: 8 }]}>
          <Text style={styles.chartTitle}>En resumen</Text>
          <Text style={styles.paragraph}>
            El segmento institucional sostiene el negocio mientras el detal exige atención frente a la competencia y al
            tipo de cambio. Atender el inventario detenido, reabastecer lo crítico y reactivar a los clientes en riesgo
            son las palancas más rápidas. Este reporte es una herramienta de apoyo: las cifras y proyecciones deben
            leerse junto con el conocimiento del mercado y del entorno del país.
          </Text>
        </View>

        <Footer />
      </Page>
    </Document>
  );
}
