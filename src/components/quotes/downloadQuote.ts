import type { Quote } from "../../services/quotesService";
import { settingsService, type CompanyInfo } from "../../services/settingsService";

// Genera y descarga el PDF de un presupuesto. La librería de PDF se carga de forma
// diferida (chunk aparte) solo al invocar esto. Reutilizable desde el historial
// (botón por fila) y desde la pantalla de éxito al crear un presupuesto.
export async function downloadQuotePdf(quote: Quote): Promise<void> {
  // Branding desde la configuración (best-effort): si falla, el documento usa sus
  // valores por defecto, así que la descarga nunca se rompe por esto.
  let company: CompanyInfo | undefined;
  try {
    company = await settingsService.getCompany();
  } catch {
    company = undefined;
  }
  const { buildQuoteBlob } = await import("./generateQuotePdf");
  const blob = await buildQuoteBlob({ quote, company });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Presupuesto-${quote.quote_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Liberar el objeto tras dar tiempo a que arranque la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
