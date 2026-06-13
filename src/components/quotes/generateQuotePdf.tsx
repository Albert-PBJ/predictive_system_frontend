// Punto de entrada que junta react-pdf + el documento del presupuesto. Se importa de
// forma DINÁMICA (`await import("./generateQuotePdf")`) para que la pesada librería de
// PDF quede en un chunk aparte y no infle el bundle inicial: solo se descarga al
// generar/descargar un presupuesto.

import { pdf } from "@react-pdf/renderer";
import QuoteDocument, { type QuoteDocumentProps } from "./QuoteDocument";

export async function buildQuoteBlob(props: QuoteDocumentProps): Promise<Blob> {
  return pdf(<QuoteDocument {...props} />).toBlob();
}
