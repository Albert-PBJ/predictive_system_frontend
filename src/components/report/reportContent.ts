// Síntesis de contenido del reporte ejecutivo: convierte las cifras del panel
// (`ExecutiveDashboard`) y los pronósticos (`OverviewResponse` / `ForecastResponse`)
// en preocupaciones, riesgos, estimaciones y acciones, redactadas en lenguaje
// simple para el dueño/CEO. Todo es función pura (no toca React ni la red).

import type { ExecutiveDashboard } from "../../services/statsService";
import type { OverviewResponse, ForecastResponse } from "../../services/analyticsService";
import { fmtUSD, fmtCompactUSD, fmtInt, fmtVES, fmtPct } from "../../utils/format";

export type Severity = "high" | "medium" | "low";

export interface ReportRisk {
  severity: Severity;
  title: string;
  text: string;
}

export interface ReportAction {
  title: string;
  text: string;
}

export interface EstimationItem {
  label: string;
  value: string;
  sub?: string;
}

// ¿El solicitante ve cifras sensibles? El backend ya omite utilidad/margen/IVC para
// el personal no gerencial, así que basta con detectar su presencia.
export function isSensitive(d: ExecutiveDashboard): boolean {
  return d.kpis.profit !== undefined;
}

// Porcentaje con signo explícito para variaciones (+12.3% / -4.1%).
export function signedPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toLocaleString("es-VE", { maximumFractionDigits: digits })}%`;
}

// "subió un 12%" / "bajó un 4%" / "se mantuvo" — para frases narrativas.
function movWord(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "se mantuvo";
  if (v > 1) return `subió un ${fmtPct(Math.abs(v))}`;
  if (v < -1) return `bajó un ${fmtPct(Math.abs(v))}`;
  return "se mantuvo estable";
}

const RETAIL = (s: string) => /detal/i.test(s);

function retailShare(d: ExecutiveDashboard): number | null {
  const r = d.type_split.find((t) => RETAIL(t.type) || RETAIL(t.label));
  return r ? r.share_pct : null;
}

// Pendiente del segmento detal (primer vs. último mes del rango).
function retailTrend(d: ExecutiveDashboard): { declining: boolean; changePct: number | null } {
  const m = d.monthly_by_type;
  if (m.length < 2) return { declining: false, changePct: null };
  const first = m[0].retail;
  const last = m[m.length - 1].retail;
  if (first <= 0) return { declining: false, changePct: null };
  const changePct = ((last - first) / first) * 100;
  return { declining: changePct < -5, changePct };
}

function deadStockValue(d: ExecutiveDashboard): number {
  return d.no_demand.reduce((a, p) => a + (p.retail_value || 0), 0);
}

function atRiskValue(d: ExecutiveDashboard): number {
  return d.at_risk.reduce((a, c) => a + (c.revenue || 0), 0);
}

// ---- Resumen de la situación (lenguaje simple) ----
export function buildSituation(d: ExecutiveDashboard): string {
  const k = d.kpis;
  const parts: string[] = [];
  parts.push(
    `En el periodo seleccionado la empresa facturó ${fmtUSD(k.revenue)} en ${fmtInt(k.sales_count)} ventas` +
      (k.revenue_delta_pct != null ? `, lo que ${movWord(k.revenue_delta_pct)} frente al periodo anterior.` : "."),
  );
  if (k.profit !== undefined) {
    parts.push(
      `La utilidad fue de ${fmtUSD(k.profit)}` +
        (k.margin_pct != null ? ` (margen de ${fmtPct(k.margin_pct)})` : "") +
        (k.profit_delta_pct != null ? ` y ${movWord(k.profit_delta_pct)}.` : "."),
    );
  }
  const share = retailShare(d);
  if (share != null) {
    parts.push(
      `El negocio institucional/proyectos aporta la mayor parte de los ingresos; el detal representa ` +
        `cerca del ${fmtPct(share)} y es el segmento más sensible a la competencia.`,
    );
  }
  return parts.join(" ");
}

// ---- Preocupaciones y riesgos ----
export function buildRisks(d: ExecutiveDashboard): ReportRisk[] {
  const risks: ReportRisk[] = [];
  const inv = d.inventory_health;
  const k = d.kpis;

  // Capital inmovilizado (productos sin demanda).
  if (d.no_demand_count > 0) {
    const val = deadStockValue(d);
    const share = inv.inventory_retail_usd > 0 ? val / inv.inventory_retail_usd : 0;
    const names = d.no_demand.slice(0, 3).map((p) => p.name).join(", ");
    risks.push({
      severity: share > 0.15 || d.no_demand_count > 12 ? "high" : "medium",
      title: "Capital inmovilizado en inventario",
      text:
        `${fmtInt(d.no_demand_count)} producto(s) activos no registraron ninguna venta en el periodo, ` +
        `con ${fmtUSD(val)} detenidos en stock. Es dinero parado que no rota` +
        (names ? ` (p.ej. ${names}).` : "."),
    });
  }

  // Quiebres de stock (ventas perdidas).
  if (inv.out_of_stock > 0) {
    risks.push({
      severity: "high",
      title: "Productos sin stock",
      text:
        `Hay ${fmtInt(inv.out_of_stock)} producto(s) sin existencias` +
        (inv.low_stock > 0 ? ` y ${fmtInt(inv.low_stock)} con stock bajo` : "") +
        `. Cada quiebre es una venta que se pierde o se va a la competencia.`,
    });
  } else if (inv.low_stock > 0) {
    risks.push({
      severity: "medium",
      title: "Stock bajo",
      text: `${fmtInt(inv.low_stock)} producto(s) están por debajo del mínimo y pronto pueden quedar sin existencias.`,
    });
  }

  // Fuga de clientes (churn).
  if (d.at_risk.length > 0) {
    const val = atRiskValue(d);
    risks.push({
      severity: val > k.revenue * 0.5 ? "high" : "medium",
      title: "Clientes en riesgo de fuga",
      text:
        `${fmtInt(d.at_risk.length)} cliente(s) llevan más de 6 meses sin comprar. ` +
        `Representan ${fmtUSD(val)} en compras históricas que podríamos estar perdiendo.`,
    });
  }

  // Declive del segmento detal.
  const rt = retailTrend(d);
  if (rt.declining) {
    risks.push({
      severity: "medium",
      title: "El segmento detal se está debilitando",
      text:
        `Las ventas al detal cayeron ${signedPct(rt.changePct)} dentro del periodo. ` +
        `El cliente pequeño tiende a migrar hacia competidores más baratos; conviene defender ese segmento.`,
    });
  }

  // Ingresos a la baja.
  if (k.revenue_delta_pct != null && k.revenue_delta_pct < -8) {
    risks.push({
      severity: k.revenue_delta_pct < -20 ? "high" : "medium",
      title: "Caída de ingresos",
      text: `Los ingresos ${movWord(k.revenue_delta_pct)} respecto al periodo anterior. Vale la pena revisar la causa (demanda, precios o tasa).`,
    });
  }

  // Margen comprimido (sensible).
  if (k.margin_delta_pts != null && k.margin_delta_pts < -1) {
    risks.push({
      severity: "medium",
      title: "El margen se está comprimiendo",
      text: `El margen bajó ${fmtPct(Math.abs(k.margin_delta_pts))} puntos frente al periodo anterior: se vende parecido pero se gana menos por venta.`,
    });
  }

  // Shock cambiario.
  if (d.exchange_rate?.parallel_change_pct != null && d.exchange_rate.parallel_change_pct > 12) {
    risks.push({
      severity: "medium",
      title: "Presión del tipo de cambio",
      text:
        `El dólar paralelo subió ${fmtPct(d.exchange_rate.parallel_change_pct)} en el periodo ` +
        `(cierre ${fmtVES(d.exchange_rate.end_parallel)}). Encarece los productos y suele frenar la demanda.`,
    });
  }

  // Competitividad de precio (sensible).
  if (d.competitive?.price_score != null && d.competitive.price_score < 40) {
    const above = d.competitive.positioning.filter((p) => p.position === "above").length;
    risks.push({
      severity: "medium",
      title: "Precios por encima del mercado",
      text:
        `El índice de competitividad de precio es ${Math.round(d.competitive.price_score)}/100` +
        (above ? ` y hay ${fmtInt(above)} categoría(s) por encima del mercado scrapeado.` : ".") +
        ` Eso explica parte de la fuga del detal.`,
    });
  }

  // Alertas reales del sistema (críticas/altas).
  for (const a of d.alerts.filter((x) => x.severity === "CRIT").slice(0, 2)) {
    risks.push({ severity: "high", title: a.title, text: a.message });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return risks.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 6);
}

// ---- Estimaciones (lo que viene) ----
export function buildEstimations(
  _d: ExecutiveDashboard,
  ov: OverviewResponse | null,
): { intro: string; items: EstimationItem[] } {
  const items: EstimationItem[] = [];
  if (!ov) {
    return {
      intro:
        "Las proyecciones detalladas (ventas, tasa de cambio y reposición) están disponibles para la gerencia en el módulo de predicciones.",
      items,
    };
  }

  const h = ov.headlines;
  if (h.next_revenue) {
    const r2 = ov.headlines.revenue_model?.r2;
    items.push({
      label: "Ventas del próximo mes",
      value: fmtUSD(h.next_revenue.value),
      sub:
        `Proyección del modelo` + (r2 != null ? ` (confianza R² ${r2.toFixed(2)}).` : ".") +
        (h.next_revenue.lower != null && h.next_revenue.upper != null
          ? ` Rango ${fmtCompactUSD(h.next_revenue.lower)}–${fmtCompactUSD(h.next_revenue.upper)}.`
          : ""),
    });
  }
  if (h.next_bcv || h.next_parallel) {
    items.push({
      label: "Tipo de cambio (próx. mes)",
      value: `${h.next_bcv ? fmtVES(h.next_bcv.value) : "—"} BCV`,
      sub: h.next_parallel ? `Paralela proyectada ${fmtVES(h.next_parallel.value)}. El dólar seguiría su tendencia al alza.` : undefined,
    });
  }
  if (h.pipeline) {
    items.push({
      label: "Presupuestos por cerrar",
      value: fmtUSD(h.pipeline.expected_revenue_usd),
      sub:
        `${fmtInt(h.pipeline.open_count)} presupuesto(s) abiertos por ${fmtUSD(h.pipeline.total_value_usd)}; ` +
        `se espera cerrar ~${fmtPct(h.pipeline.expected_rate_pct)} de ese valor.`,
    });
  }
  if (h.quote_conversion_rate != null) {
    items.push({
      label: "Conversión de presupuestos",
      value: fmtPct(h.quote_conversion_rate * (h.quote_conversion_rate <= 1 ? 100 : 1)),
      sub: "Tasa histórica con la que las cotizaciones terminan en venta.",
    });
  }
  if (ov.restock_alerts?.length) {
    const soon = [...ov.restock_alerts].sort(
      (a, b) => (a.months_of_cover ?? 99) - (b.months_of_cover ?? 99),
    )[0];
    items.push({
      label: "Reposición de inventario",
      value: `${fmtInt(ov.restock_alerts.length)} producto(s)`,
      sub: soon?.product_name ? `El más urgente: ${soon.product_name}${soon.stockout_label ? ` (${soon.stockout_label})` : ""}.` : undefined,
    });
  }

  const intro =
    "Con base en el histórico, los modelos proyectan lo siguiente para los próximos meses. " +
    "Son estimaciones de apoyo a la decisión, no certezas: úsense como guía y revísense con el contexto del país.";
  return { intro, items };
}

// ---- Acciones sugeridas (mapeadas a los riesgos) ----
export function buildActions(d: ExecutiveDashboard, ov: OverviewResponse | null): ReportAction[] {
  const actions: ReportAction[] = [];
  const inv = d.inventory_health;
  const k = d.kpis;

  if (d.no_demand_count > 0) {
    const names = d.no_demand.slice(0, 3).map((p) => p.name).join(", ");
    actions.push({
      title: "Liberar el inventario detenido",
      text:
        `Active promociones, combos o descuentos sobre los ${fmtInt(d.no_demand_count)} producto(s) sin rotación ` +
        `(${fmtUSD(deadStockValue(d))} parados)${names ? `, empezando por ${names}` : ""}. Convertir ese stock en caja mejora la liquidez.`,
    });
  }

  if (inv.out_of_stock > 0 || inv.low_stock > 0) {
    const soon = ov?.restock_alerts?.[0];
    actions.push({
      title: "Reabastecer lo que falta",
      text:
        `Reponga los ${fmtInt(inv.out_of_stock)} producto(s) sin stock y los ${fmtInt(inv.low_stock)} con stock bajo para no perder ventas` +
        (soon?.suggested_reorder_qty ? `. Sugerencia del modelo: reordenar ~${fmtInt(soon.suggested_reorder_qty)} uds. de ${soon.product_name ?? "el más crítico"}.` : "."),
    });
  }

  if (d.at_risk.length > 0) {
    actions.push({
      title: "Reactivar clientes en riesgo",
      text:
        `Contacte a los ${fmtInt(d.at_risk.length)} cliente(s) que dejaron de comprar (${fmtUSD(atRiskValue(d))} históricos) ` +
        `con una oferta de reenganche. Recuperar un cliente conocido cuesta menos que conseguir uno nuevo.`,
    });
  }

  const rt = retailTrend(d);
  if (rt.declining || (d.competitive?.price_score != null && d.competitive.price_score < 45)) {
    actions.push({
      title: "Defender el segmento detal",
      text:
        "Revise los precios frente a la competencia en las categorías donde está por encima del mercado y arme " +
        "ofertas/combos para el cliente pequeño, que es el más sensible al precio.",
    });
  }

  if (ov?.headlines.pipeline && ov.headlines.pipeline.open_count > 0) {
    actions.push({
      title: "Acelerar el pipeline institucional",
      text:
        `Dé seguimiento a los ${fmtInt(ov.headlines.pipeline.open_count)} presupuestos abiertos ` +
        `(${fmtUSD(ov.headlines.pipeline.expected_revenue_usd)} esperados). El segmento institucional es el que sostiene el crecimiento.`,
    });
  } else if (k.conversion_rate != null && k.conversion_rate < (k.conversion_rate <= 1 ? 0.5 : 50)) {
    actions.push({
      title: "Mejorar la conversión de presupuestos",
      text: `La conversión está en ${fmtPct(k.conversion_rate <= 1 ? k.conversion_rate * 100 : k.conversion_rate)}. Un seguimiento sistemático a las cotizaciones abiertas puede subirla.`,
    });
  }

  if (d.exchange_rate?.parallel_change_pct != null && d.exchange_rate.parallel_change_pct > 12) {
    actions.push({
      title: "Proteger márgenes ante el dólar",
      text:
        "Ajuste los precios de lista a la tasa vigente, revise costos y evite acumular inventario ocioso: " +
        "con el dólar subiendo, el capital parado pierde valor rápido.",
    });
  }

  return actions.slice(0, 6);
}

// ---- Series para el gráfico de pronóstico (historia sólida + futuro punteado) ----
export function forecastSeries(f: ForecastResponse): {
  labels: string[];
  history: (number | null)[];
  forecast: (number | null)[];
  divider: number;
} {
  const hist = f.history ?? [];
  const fc = f.forecast ?? [];
  const labels = [...hist.map((p) => p.label), ...fc.map((p) => p.label)];
  const H = hist.length;
  const history: (number | null)[] = labels.map((_, i) => (i < H ? hist[i].value : null));
  // El pronóstico arranca en el último punto histórico para que las líneas conecten.
  const forecast: (number | null)[] = labels.map((_, i) => {
    if (i === H - 1 && H > 0) return hist[H - 1].value;
    if (i >= H) return fc[i - H].value;
    return null;
  });
  return { labels, history, forecast, divider: H - 1 };
}
