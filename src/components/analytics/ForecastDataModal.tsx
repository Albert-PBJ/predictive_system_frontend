import { Modal } from "../ui/modal";
import Badge from "../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { DetailEntry } from "../../services/analyticsService";
import { featureLabel, featureHint } from "./featureLabels";

interface ForecastDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  detail: DetailEntry | null;
}

/**
 * Modal "Ver datos": muestra las filas que sustentan el valor del período seleccionado
 * en el gráfico. Para períodos históricos son los registros de origen (ventas, líneas,
 * tasas, cambios de precio); para períodos pronosticados, las variables de entrada que
 * usó el modelo.
 */
export default function ForecastDataModal({ isOpen, onClose, periodLabel, detail }: ForecastDataModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-3xl">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Datos de {periodLabel}</h3>
          {detail && (
            <Badge variant="light" color={detail.kind === "forecast" ? "warning" : "info"} size="sm">
              {detail.kind === "forecast" ? "Período pronosticado" : "Período histórico"}
            </Badge>
          )}
        </div>

        {detail && detail.kind === "forecast" && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Variables de entrada que el modelo usó para pronosticar este mes.
          </p>
        )}

        {!detail || detail.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay registros de detalle para este período.
          </p>
        ) : (
          <div className="max-h-[55vh] max-w-full overflow-auto custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                <TableRow>
                  {detail.columns.map((c) => (
                    <TableCell
                      key={c}
                      isHeader
                      className="px-4 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      {c}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {detail.rows.map((row, ri) => (
                  <TableRow key={ri}>
                    {row.map((cell, ci) => {
                      // En el detalle de un mes pronosticado, la columna "Variable"
                      // trae el nombre técnico de la feature: lo mostramos amigable.
                      const isVar = detail.columns[ci] === "Variable" && typeof cell === "string";
                      return (
                        <TableCell
                          key={ci}
                          className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300"
                        >
                          {cell === null || cell === undefined ? (
                            "—"
                          ) : isVar ? (
                            <span title={featureHint(cell as string)}>{featureLabel(cell as string)}</span>
                          ) : (
                            String(cell)
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Modal>
  );
}
