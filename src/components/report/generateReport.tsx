// Punto de entrada que junta react-pdf + el documento. Se importa de forma DINÁMICA
// desde el botón (`await import("./generateReport")`) para que la pesada librería de
// PDF quede en un chunk aparte y NO infle el bundle inicial del panel: solo se
// descarga cuando el usuario genera un reporte.

import { pdf } from "@react-pdf/renderer";
import ReportDocument, { type ReportDocumentProps } from "./ReportDocument";

export async function buildReportBlob(props: ReportDocumentProps): Promise<Blob> {
  return pdf(<ReportDocument {...props} />).toBlob();
}
