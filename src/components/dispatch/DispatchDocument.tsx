// Documento PDF de una orden de despacho con react-pdf. Función pura de sus props
// (se renderiza en el reconciler de react-pdf, fuera del árbol de la app). Es una
// NOTA DE ENTREGA: lista la mercancía a despachar, la dirección y las firmas de
// despacho y recepción. No lleva precios (no es una factura ni un presupuesto).

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { DispatchOrder } from "../../services/dispatchService";
import type { CompanyInfo } from "../../services/settingsService";

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
  page: { paddingTop: 34, paddingBottom: 60, paddingHorizontal: 36, fontSize: 9.5, color: c.body, fontFamily: "Helvetica" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  company: { fontSize: 16, fontWeight: "bold", color: c.ink },
  companySub: { fontSize: 8.5, color: c.muted, marginTop: 2, maxWidth: 240 },

  docBox: { alignItems: "flex-end" },
  docKicker: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, color: c.brand },
  docNumber: { fontSize: 14, fontWeight: "bold", color: c.ink, marginTop: 2 },
  docMeta: { fontSize: 8.5, color: c.muted, marginTop: 3 },

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
  colSku: { width: 110 },
  colQty: { width: 60, textAlign: "right" },
  sku: { fontSize: 7, color: c.muted, marginTop: 1 },

  notesBox: { marginTop: 18, borderWidth: 1, borderColor: c.grid, borderRadius: 4, padding: 10 },
  notesTitle: { fontSize: 8, fontWeight: "bold", color: c.ink, marginBottom: 3 },
  notesText: { fontSize: 8, color: c.muted, lineHeight: 1.4 },

  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 42 },
  signBox: { width: "45%" },
  signLine: { borderTopWidth: 1, borderTopColor: c.ink, marginBottom: 3 },
  signLabel: { fontSize: 8, color: c.muted, textAlign: "center" },

  footer: { position: "absolute", bottom: 20, left: 36, right: 36, borderTopWidth: 1, borderTopColor: c.grid, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: c.muted },
});

const fmtDay = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export interface DispatchDocumentProps {
  order: DispatchOrder;
  company?: CompanyInfo;
}

export default function DispatchDocument({ order, company }: DispatchDocumentProps) {
  const co = company ?? DEFAULT_COMPANY;
  const companySub =
    [co.rif && `RIF: ${co.rif}`, co.phone, co.website].filter(Boolean).join(" · ") ||
    "Mobiliario de oficina · Venezuela";
  const totalUnits = order.items.reduce((a, it) => a + it.quantity, 0);

  return (
    <Document title={`Orden de despacho ${order.order_number}`} author={co.name} subject="Orden de despacho">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.company}>{co.name}</Text>
            <Text style={styles.companySub}>{companySub}</Text>
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docKicker}>ORDEN DE DESPACHO</Text>
            <Text style={styles.docNumber}>N° {order.order_number}</Text>
            <Text style={styles.docMeta}>Venta asociada: #{order.sale}</Text>
            <Text style={styles.docMeta}>Fecha de despacho: {fmtDay(order.dispatch_date)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>CLIENTE</Text>
            <Text style={styles.panelName}>{order.customer_name}</Text>
            {order.customer_rif ? <Text style={styles.panelLine}>RIF: {order.customer_rif}</Text> : null}
            {order.delivery_address ? (
              <>
                <Text style={[styles.panelLabel, { marginTop: 8 }]}>DIRECCIÓN DE ENTREGA</Text>
                <Text style={styles.panelLine}>{order.delivery_address}</Text>
              </>
            ) : null}
          </View>
          <View style={[styles.panel, { alignItems: "flex-end" }]}>
            <Text style={styles.panelLabel}>DESPACHO</Text>
            <Text style={styles.panelLine}>Vendedor: {order.seller_name || "—"}</Text>
            <Text style={styles.panelLine}>Transporte: {order.carrier || "—"}</Text>
            <Text style={styles.panelLine}>Fecha de venta: {fmtDay(order.sale_date)}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Producto</Text>
          <Text style={[styles.th, styles.colSku]}>SKU</Text>
          <Text style={[styles.th, styles.colQty]}>Cantidad</Text>
        </View>
        {order.items.map((it, i) => (
          <View key={it.id} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
            <Text style={[styles.td, styles.colDesc]}>{it.product_name}</Text>
            <Text style={[styles.td, styles.colSku]}>{it.product_sku ?? "—"}</Text>
            <Text style={[styles.td, styles.colQty]}>{it.quantity}</Text>
          </View>
        ))}
        <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.td, styles.colDesc, { fontWeight: "bold", color: c.ink }]}>Total de unidades</Text>
          <Text style={[styles.td, styles.colSku]}> </Text>
          <Text style={[styles.td, styles.colQty, { fontWeight: "bold", color: c.ink }]}>{totalUnits}</Text>
        </View>

        {order.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Observaciones</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        ) : null}

        <View style={styles.notesBox}>
          <Text style={styles.notesText}>
            • Verifique que la mercancía recibida coincida con las cantidades detalladas antes de firmar.
          </Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Despachador</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Recibido conforme{order.received_by ? `: ${order.received_by}` : ""}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{co.name} · Orden de despacho {order.order_number}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
