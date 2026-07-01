// Punto de entrada que junta react-pdf + el documento de la orden de despacho. Se
// importa de forma DINÁMICA para que la pesada librería de PDF quede en un chunk
// aparte (compartido con el presupuesto y el reporte ejecutivo) y no infle el bundle
// inicial: solo se descarga al generar/descargar una orden.

import { pdf } from "@react-pdf/renderer";
import DispatchDocument, { type DispatchDocumentProps } from "./DispatchDocument";

export async function buildDispatchBlob(props: DispatchDocumentProps): Promise<Blob> {
  return pdf(<DispatchDocument {...props} />).toBlob();
}
