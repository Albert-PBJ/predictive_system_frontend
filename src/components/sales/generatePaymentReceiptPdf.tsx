// Punto de entrada que junta react-pdf + el documento del recibo de pago. Se importa
// de forma DINÁMICA para que la pesada librería de PDF quede en el mismo chunk aparte
// (compartido con el presupuesto, la orden de despacho y el reporte ejecutivo) y no
// infle el bundle inicial: solo se descarga al generar un recibo.

import { pdf } from "@react-pdf/renderer";
import PaymentReceiptDocument, { type PaymentReceiptDocumentProps } from "./PaymentReceiptDocument";

export async function buildPaymentReceiptBlob(props: PaymentReceiptDocumentProps): Promise<Blob> {
  return pdf(<PaymentReceiptDocument {...props} />).toBlob();
}
