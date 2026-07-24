import type { Sale, SalePayment } from "../../services/salesService";
import { settingsService, type CompanyInfo } from "../../services/settingsService";
import { receiptNumber, type ReceiptVariant } from "./PaymentReceiptDocument";

// Genera y descarga el PDF de un recibo de pago (abono), en su variante para el cliente
// o para control interno. La librería de PDF se carga de forma diferida (chunk aparte)
// solo al invocar esto. Reutilizable desde el modal de abono y desde el historial de
// ventas (por cada abono de la venta).
export async function downloadPaymentReceiptPdf(
  sale: Sale,
  payment: SalePayment,
  variant: ReceiptVariant,
): Promise<void> {
  // Branding desde la configuración (best-effort): si falla, el documento usa sus
  // valores por defecto, así que la descarga nunca se rompe por esto.
  let company: CompanyInfo | undefined;
  try {
    company = await settingsService.getCompany();
  } catch {
    company = undefined;
  }
  const { buildPaymentReceiptBlob } = await import("./generatePaymentReceiptPdf");
  const blob = await buildPaymentReceiptBlob({ sale, payment, variant, company });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Recibo-${receiptNumber(payment)}-${variant}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Liberar el objeto tras dar tiempo a que arranque la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
