import type { DispatchOrder } from "../../services/dispatchService";
import { settingsService, type CompanyInfo } from "../../services/settingsService";

// Genera y descarga el PDF de una orden de despacho. La librería de PDF se carga de
// forma diferida (chunk aparte) solo al invocar esto. Reutilizable desde el modal de
// creación y desde el listado de órdenes de despacho.
export async function downloadDispatchPdf(order: DispatchOrder): Promise<void> {
  // Branding desde la configuración (best-effort): si falla, el documento usa sus
  // valores por defecto, así que la descarga nunca se rompe por esto.
  let company: CompanyInfo | undefined;
  try {
    company = await settingsService.getCompany();
  } catch {
    company = undefined;
  }
  const { buildDispatchBlob } = await import("./generateDispatchPdf");
  const blob = await buildDispatchBlob({ order, company });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Orden-despacho-${order.order_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
