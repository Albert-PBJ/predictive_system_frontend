// Documento PDF de un presupuesto (cotización) con react-pdf. Es función pura de sus
// props (se renderiza en el reconciler de react-pdf, fuera del árbol de la app).
// Estilo "factura/presupuesto" profesional: encabezado de la empresa, datos del
// cliente, tabla de líneas, totales (subtotal + IVA + total) en USD y VES.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Quote } from "../../services/quotesService";
import type { CompanyInfo } from "../../services/settingsService";

// Datos de empresa por defecto (cuando no se inyecta la configuración). Garantiza
// que el PDF nunca quede sin encabezado aunque falle la lectura del branding.
const DEFAULT_COMPANY: CompanyInfo = {
  name: "Inversiones Maescar C.A.",
  rif: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
};

const c = {
  brand: "#465fff",
  ink: "#1d2939",
  body: "#475467",
  muted: "#667085",
  grid: "#e4e7ec",
  track: "#f7f8fa",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 44, paddingHorizontal: 36, fontSize: 9.5, color: c.body, fontFamily: "Helvetica" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  company: { fontSize: 16, fontWeight: "bold", color: c.ink },
  companySub: { fontSize: 8.5, color: c.muted, marginTop: 2, maxWidth: 240 },

  docBox: { alignItems: "flex-end" },
  docKicker: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, color: c.brand },
  docNumber: { fontSize: 14, fontWeight: "bold", color: c.ink, marginTop: 2 },
  docMeta: { fontSize: 8.5, color: c.muted, marginTop: 3 },

  statusPill: { marginTop: 6, fontSize: 8, fontWeight: "bold", color: c.white, backgroundColor: c.brand, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3 },

  divider: { borderBottomWidth: 1, borderBottomColor: c.grid, marginVertical: 12 },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  panel: { width: "48%" },
  panelLabel: { fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.6, color: c.muted, marginBottom: 3 },
  panelName: { fontSize: 11, fontWeight: "bold", color: c.ink },
  panelLine: { fontSize: 8.5, color: c.body, marginTop: 1.5 },

  tableHeader: { flexDirection: "row", backgroundColor: c.brand, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6, marginTop: 4 },
  th: { fontSize: 8, fontWeight: "bold", color: c.white },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: c.grid },
  tableRowAlt: { backgroundColor: c.track },
  td: { fontSize: 8.5, color: c.body },

  colDesc: { flex: 1, paddingRight: 6 },
  colQty: { width: 42, textAlign: "right" },
  colUnit: { width: 78, textAlign: "right" },
  colTotal: { width: 84, textAlign: "right" },

  sku: { fontSize: 7, color: c.muted, marginTop: 1 },

  totals: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totalsBox: { width: 240 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalLabel: { fontSize: 9, color: c.body },
  totalValue: { fontSize: 9, color: c.ink, fontWeight: "bold" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.grid },
  grandLabel: { fontSize: 11, fontWeight: "bold", color: c.ink },
  grandValue: { fontSize: 13, fontWeight: "bold", color: c.brand },
  vesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  vesText: { fontSize: 8, color: c.muted },

  notesBox: { marginTop: 18, borderWidth: 1, borderColor: c.grid, borderRadius: 4, padding: 10 },
  notesTitle: { fontSize: 8, fontWeight: "bold", color: c.ink, marginBottom: 3 },
  notesText: { fontSize: 8, color: c.muted, lineHeight: 1.4 },

  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 1, borderTopColor: c.grid, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: c.muted },
});

const USD = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const VES = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `Bs ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDay = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export interface QuoteDocumentProps {
  quote: Quote;
  company?: CompanyInfo;
}

export default function QuoteDocument({ quote, company }: QuoteDocumentProps) {
  const co = company ?? DEFAULT_COMPANY;
  const ivaPct = Number(quote.iva_rate ?? 0);
  const totalVes = VES(quote.total_ves);
  const subtotalVes = VES(quote.subtotal_ves);

  // Subtítulo del encabezado: RIF · teléfono · web (lo que haya); si no, una glosa.
  const companySub =
    [co.rif && `RIF: ${co.rif}`, co.phone, co.website].filter(Boolean).join(" · ") ||
    "Mobiliario de oficina · Venezuela";

  const extras: string[] = [];
  if (quote.includes_installation) extras.push("Incluye servicio de instalación.");
  if (quote.includes_delivery) extras.push("Incluye despacho / flete.");

  return (
    <Document title={`Presupuesto ${quote.quote_number}`} author={co.name} subject="Presupuesto">
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>{co.name}</Text>
            <Text style={styles.companySub}>{companySub}</Text>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docKicker}>PRESUPUESTO</Text>
            <Text style={styles.docNumber}>N° {quote.quote_number}</Text>
            <Text style={styles.docMeta}>Emitido: {fmtDay(quote.issued_date)}</Text>
            {quote.expiry_date ? <Text style={styles.docMeta}>Válido hasta: {fmtDay(quote.expiry_date)}</Text> : null}
            <Text style={styles.statusPill}>{quote.status_display}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Cliente + vendedor */}
        <View style={styles.twoCol}>
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>CLIENTE</Text>
            <Text style={styles.panelName}>{quote.customer_name}</Text>
            {quote.customer_rif ? <Text style={styles.panelLine}>RIF: {quote.customer_rif}</Text> : null}
          </View>
          <View style={[styles.panel, { alignItems: "flex-end" }]}>
            <Text style={styles.panelLabel}>ATENDIDO POR</Text>
            <Text style={styles.panelName}>{quote.seller_name || "—"}</Text>
            <Text style={styles.panelLine}>Fecha de emisión: {fmtDay(quote.issued_date)}</Text>
          </View>
        </View>

        {/* Tabla de líneas */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Producto</Text>
          <Text style={[styles.th, styles.colQty]}>Cant.</Text>
          <Text style={[styles.th, styles.colUnit]}>Precio unit.</Text>
          <Text style={[styles.th, styles.colTotal]}>Total</Text>
        </View>
        {quote.items.map((it, i) => (
          <View key={it.id} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
            <View style={styles.colDesc}>
              <Text style={styles.td}>{it.product_name}</Text>
              {it.product_sku ? <Text style={styles.sku}>{it.product_sku}</Text> : null}
            </View>
            <Text style={[styles.td, styles.colQty]}>{it.quantity}</Text>
            <Text style={[styles.td, styles.colUnit]}>{USD(it.unit_price_usd)}</Text>
            <Text style={[styles.td, styles.colTotal]}>{USD(it.line_total_usd)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{USD(quote.subtotal_usd)}</Text>
            </View>
            {subtotalVes ? (
              <View style={styles.vesRow}>
                <Text style={styles.vesText}>Subtotal (VES)</Text>
                <Text style={styles.vesText}>{subtotalVes}</Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({ivaPct.toLocaleString("es-VE", { maximumFractionDigits: 2 })}%)</Text>
              <Text style={styles.totalValue}>{USD(quote.iva_amount_usd)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandValue}>{USD(quote.total_usd)}</Text>
            </View>
            {totalVes ? (
              <View style={styles.vesRow}>
                <Text style={styles.vesText}>Total (VES)</Text>
                <Text style={styles.vesText}>{totalVes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Notas / condiciones */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Condiciones</Text>
          {extras.map((e, i) => (
            <Text key={i} style={styles.notesText}>• {e}</Text>
          ))}
          <Text style={styles.notesText}>
            • Precios expresados en dólares estadounidenses (USD); el equivalente en bolívares se calcula a la tasa
            {quote.parallel_rate ? ` (${VES(quote.parallel_rate)}/USD)` : ""} vigente a la fecha de emisión y puede variar.
          </Text>
          <Text style={styles.notesText}>
            • Este presupuesto es una oferta de precios sujeta a disponibilidad y no constituye una factura.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{co.name} · Presupuesto {quote.quote_number}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
