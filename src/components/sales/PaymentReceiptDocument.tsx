// Documento PDF de un RECIBO / COMPROBANTE DE PAGO (abono) con react-pdf. Es función
// pura de sus props (se renderiza en el reconciler de react-pdf, fuera del árbol de la
// app). Documenta un pago concreto (SalePayment) hecho sobre una venta: monto recibido
// en USD/VES, medio de pago, y el estado de cobranza resultante (total, abonado, saldo).
//
// Tiene dos variantes ("copias"):
//   • cliente — copia para entregar al cliente como constancia del pago.
//   • interno — copia para archivo y control: añade quién lo registró y el historial
//     completo de abonos de la venta.
// NO es una factura fiscal: lleva el sello "No válido para uso fiscal.".

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Sale, SalePayment } from "../../services/salesService";
import type { CompanyInfo } from "../../services/settingsService";

// Datos de empresa por defecto (cuando no se inyecta la configuración). Garantiza que
// el recibo nunca quede sin encabezado aunque falle la lectura del branding.
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
  ok: "#12b76a",
  warn: "#b54708",
  warnBg: "#fffaeb",
};

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 56, paddingHorizontal: 36, fontSize: 9.5, color: c.body, fontFamily: "Helvetica" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  companyBlock: { maxWidth: 300, paddingRight: 12 },
  company: { fontSize: 16, fontWeight: "bold", color: c.ink },
  companySub: { fontSize: 8.5, color: c.muted, marginTop: 2, maxWidth: 290 },

  docBox: { alignItems: "flex-end" },
  docKicker: { fontSize: 9, fontWeight: "bold", letterSpacing: 1, color: c.brand },
  docNumber: { fontSize: 14, fontWeight: "bold", color: c.ink, marginTop: 2 },
  docMeta: { fontSize: 8.5, color: c.muted, marginTop: 3 },
  copyTag: { marginTop: 5, borderWidth: 1, borderColor: c.brand, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 6, fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.6, color: c.brand },

  divider: { borderBottomWidth: 1, borderBottomColor: c.grid, marginVertical: 12 },

  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  panel: { width: "48%" },
  panelLabel: { fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.6, color: c.muted, marginBottom: 3 },
  panelName: { fontSize: 11, fontWeight: "bold", color: c.ink },
  panelLine: { fontSize: 8.5, color: c.body, marginTop: 1.5 },

  // Recuadro destacado con el monto recibido.
  amountBox: { marginTop: 4, borderWidth: 1, borderColor: c.grid, borderRadius: 5, backgroundColor: c.track, padding: 12 },
  amountLabel: { fontSize: 7.5, fontWeight: "bold", letterSpacing: 0.6, color: c.muted },
  amountUsd: { fontSize: 22, fontWeight: "bold", color: c.brand, marginTop: 2 },
  amountVes: { fontSize: 9.5, color: c.body, marginTop: 1 },
  concept: { fontSize: 9, color: c.body, marginTop: 6 },

  // Resumen de cobranza.
  summaryBox: { marginTop: 14, borderWidth: 1, borderColor: c.grid, borderRadius: 4, padding: 10 },
  summaryTitle: { fontSize: 8, fontWeight: "bold", letterSpacing: 0.6, color: c.ink, marginBottom: 5 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  sumLabel: { fontSize: 9, color: c.body },
  sumValue: { fontSize: 9, color: c.ink, fontWeight: "bold" },
  sumGrand: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 5, borderTopWidth: 1, borderTopColor: c.grid },
  statusPaid: { fontSize: 8.5, color: c.ok, marginTop: 5, fontWeight: "bold" },

  // Historial de abonos (solo copia interna).
  ledgerTitle: { fontSize: 8, fontWeight: "bold", letterSpacing: 0.6, color: c.ink, marginTop: 14, marginBottom: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: c.brand, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 6 },
  th: { fontSize: 8, fontWeight: "bold", color: c.white },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: c.grid },
  tableRowAlt: { backgroundColor: c.track },
  tableRowCur: { backgroundColor: "#eef1ff" },
  td: { fontSize: 8.5, color: c.body },
  colDate: { width: 70 },
  colMethod: { flex: 1, paddingRight: 6 },
  colRef: { width: 110, paddingRight: 6 },
  colAmt: { width: 78, textAlign: "right" },

  notesBox: { marginTop: 16, borderWidth: 1, borderColor: c.grid, borderRadius: 4, padding: 10 },
  notesText: { fontSize: 8, color: c.muted, lineHeight: 1.4, marginBottom: 1.5 },
  fiscal: { marginTop: 4, fontSize: 8.5, fontWeight: "bold", color: c.warn },

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

// N° de recibo estable derivado del pago (no hay campo dedicado en el modelo).
export const receiptNumber = (payment: SalePayment) => `RC-${String(payment.id).padStart(6, "0")}`;

export type ReceiptVariant = "cliente" | "interno";

export interface PaymentReceiptDocumentProps {
  sale: Sale;
  payment: SalePayment;
  variant: ReceiptVariant;
  company?: CompanyInfo;
}

export default function PaymentReceiptDocument({ sale, payment, variant, company }: PaymentReceiptDocumentProps) {
  const co = company ?? DEFAULT_COMPANY;
  const isInternal = variant === "interno";
  const recNo = receiptNumber(payment);
  const amountVes = VES(payment.amount_ves);
  const totalVes = VES(sale.total_with_iva_ves);

  // Cobranza AL MOMENTO de este pago, no la actual. Los abonos vienen ordenados por
  // (payment_date, id); acumulamos hasta este abono inclusive para que el recibo
  // refleje el saldo tal como quedó cuando se recibió el dinero, no el saldo de hoy
  // (un recibo del primer abono no debe decir que la venta ya está saldada).
  const ordered = [...sale.payments].sort((a, b) => {
    if (a.payment_date !== b.payment_date) return a.payment_date < b.payment_date ? -1 : 1;
    return a.id - b.id;
  });
  const paymentsToDate: SalePayment[] = [];
  let paidToDate = 0;
  for (const p of ordered) {
    paymentsToDate.push(p);
    paidToDate += Number(p.amount_usd);
    if (p.id === payment.id) break;
  }
  const total = Number(sale.total_with_iva_usd);
  const balanceToDate = Math.max(0, total - paidToDate);
  const fullyPaid = balanceToDate <= 0.005;

  // Líneas del encabezado de la empresa: dirección, teléfono(s), correo y RIF·web (lo
  // que esté configurado). Si no hay nada, una glosa por defecto.
  const companyLines = [
    co.address,
    co.phone,
    co.email,
    [co.rif && `RIF: ${co.rif}`, co.website].filter(Boolean).join("  ·  "),
  ]
    .map((l) => (l || "").trim())
    .filter(Boolean);
  if (companyLines.length === 0) companyLines.push("Mobiliario de oficina · Venezuela");

  return (
    <Document title={`Recibo de pago ${recNo}`} author={co.name} subject="Recibo de pago">
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.companyBlock}>
            <Text style={styles.company}>{co.name}</Text>
            {companyLines.map((line, i) => (
              <Text key={i} style={styles.companySub}>{line}</Text>
            ))}
          </View>
          <View style={styles.docBox}>
            <Text style={styles.docKicker}>RECIBO DE PAGO</Text>
            <Text style={styles.docNumber}>N° {recNo}</Text>
            <Text style={styles.docMeta}>Fecha: {fmtDay(payment.payment_date)}</Text>
            <Text style={styles.copyTag}>{isInternal ? "COPIA CONTROL INTERNO" : "COPIA CLIENTE"}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Cliente + datos del pago */}
        <View style={styles.twoCol}>
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>CLIENTE</Text>
            <Text style={styles.panelName}>{sale.customer_name}</Text>
            {sale.customer_rif ? <Text style={styles.panelLine}>RIF: {sale.customer_rif}</Text> : null}
          </View>
          <View style={[styles.panel, { alignItems: "flex-end" }]}>
            <Text style={styles.panelLabel}>DATOS DEL PAGO</Text>
            <Text style={styles.panelLine}>Venta asociada: #{sale.id}</Text>
            <Text style={styles.panelLine}>Medio: {payment.method_display}</Text>
            {payment.reference ? <Text style={styles.panelLine}>Referencia: {payment.reference}</Text> : null}
            {isInternal ? <Text style={styles.panelLine}>Registrado por: {payment.recorded_by_name || "—"}</Text> : null}
          </View>
        </View>

        {/* Monto recibido (destacado) */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>MONTO RECIBIDO</Text>
          <Text style={styles.amountUsd}>{USD(payment.amount_usd)}</Text>
          {amountVes ? <Text style={styles.amountVes}>Equivalente: {amountVes}</Text> : null}
          <Text style={styles.concept}>
            Por concepto de abono a la venta #{sale.id}
            {payment.notes ? ` — ${payment.notes}` : ""}.
          </Text>
        </View>

        {/* Resumen de cobranza de la venta */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>ESTADO DE COBRANZA DE LA VENTA</Text>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Total con IVA</Text>
            <Text style={styles.sumValue}>{USD(sale.total_with_iva_usd)}{totalVes ? `  ·  ${totalVes}` : ""}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Abonado hasta este pago</Text>
            <Text style={styles.sumValue}>{USD(paidToDate)}</Text>
          </View>
          <View style={styles.sumGrand}>
            <Text style={[styles.sumLabel, { fontWeight: "bold", color: c.ink }]}>Saldo</Text>
            <Text style={[styles.sumValue, { color: fullyPaid ? c.ok : c.warn }]}>{USD(balanceToDate)}</Text>
          </View>
          {fullyPaid ? (
            <Text style={styles.statusPaid}>Venta pagada en su totalidad.</Text>
          ) : null}
        </View>

        {/* Abonos aplicados hasta este pago inclusive (solo copia interna). No lista
            pagos posteriores: el recibo es un documento con fecha de este abono. */}
        {isInternal && paymentsToDate.length > 0 ? (
          <>
            <Text style={styles.ledgerTitle}>ABONOS APLICADOS HASTA ESTE PAGO</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colDate]}>Fecha</Text>
              <Text style={[styles.th, styles.colMethod]}>Medio</Text>
              <Text style={[styles.th, styles.colRef]}>Referencia</Text>
              <Text style={[styles.th, styles.colAmt]}>Monto</Text>
            </View>
            {paymentsToDate.map((p, i) => {
              const isCurrent = p.id === payment.id;
              const rowStyle = isCurrent
                ? [styles.tableRow, styles.tableRowCur]
                : i % 2 === 1
                  ? [styles.tableRow, styles.tableRowAlt]
                  : styles.tableRow;
              return (
                <View key={p.id} style={rowStyle}>
                  <Text style={[styles.td, styles.colDate]}>{fmtDay(p.payment_date)}</Text>
                  <Text style={[styles.td, styles.colMethod]}>{p.method_display}</Text>
                  <Text style={[styles.td, styles.colRef]}>{p.reference || "—"}</Text>
                  <Text style={[styles.td, styles.colAmt, isCurrent ? { fontWeight: "bold", color: c.ink } : {}]}>{USD(p.amount_usd)}</Text>
                </View>
              );
            })}
            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.td, styles.colDate, { fontWeight: "bold", color: c.ink }]}>Total</Text>
              <Text style={[styles.td, styles.colMethod]}> </Text>
              <Text style={[styles.td, styles.colRef]}> </Text>
              <Text style={[styles.td, styles.colAmt, { fontWeight: "bold", color: c.ink }]}>{USD(paidToDate)}</Text>
            </View>
          </>
        ) : null}

        {/* Notas + sello no fiscal */}
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>
            • Este comprobante certifica la recepción del pago aquí detallado por parte de {co.name}.
          </Text>
          <Text style={styles.notesText}>
            • Los montos en bolívares (Bs) se expresan a la tasa vigente a la fecha del pago y pueden variar.
          </Text>
          {isInternal ? (
            <Text style={styles.notesText}>• Copia destinada al archivo y control interno de la empresa.</Text>
          ) : null}
          <Text style={styles.fiscal}>No válido para uso fiscal.</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{co.name} · Recibo {recNo} · {isInternal ? "Control interno" : "Cliente"}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
