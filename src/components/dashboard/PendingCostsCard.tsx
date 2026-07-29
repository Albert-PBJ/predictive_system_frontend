import { useState } from "react";
import { Link } from "react-router";
import Badge from "../ui/badge/Badge";
import Alert from "../ui/alert/Alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import CostModal from "../inventory/CostModal";
import type { PendingCostRow, PendingCostsBlock } from "../../services/statsService";
import type { Movement } from "../../services/inventoryService";
import { fmtUSD, fmtDate } from "../../utils/format";

interface Props {
  data: PendingCostsBlock;
  onCosted?: () => void; // para que el panel recargue sus cifras
}

/**
 * Bandeja de trabajo de la gerencia en el panel de inicio: entradas de mercancía ya
 * recibidas cuya **factura de proveedor** todavía no se ha cargado.
 *
 * La mercancía llega antes que la factura: almacén registra la cantidad y la gerencia
 * carga el costo cuando llega el documento. Hasta que eso pase, esas unidades quedan
 * valoradas al costo promedio anterior, así que la utilidad de lo que se venda entre
 * medias sale distorsionada — de ahí que la tabla ordene por antigüedad y la acción se
 * ejecute aquí mismo, sin salir del panel.
 */
export default function PendingCostsCard({ data, onCosted }: Props) {
  const [selected, setSelected] = useState<PendingCostRow | null>(null);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number[]>([]); // ids ya costeados en esta sesión
  const [msg, setMsg] = useState<string | null>(null);

  const rows = data.rows.filter((r) => !done.includes(r.id));
  const pending = data.count - done.length;

  if (data.count === 0) return null;

  const onSaved = (updated: Movement, before: string | null, after: string | null) => {
    setDone((prev) => [...prev, updated.id]);
    setMsg(
      `Costo cargado en «${updated.product_name}». El costo promedio del producto pasó de ` +
        `${fmtUSD(before ?? 0)} a ${fmtUSD(after ?? 0)}.`,
    );
    onCosted?.();
  };

  return (
    <div className="rounded-2xl border border-warning-300 bg-white p-5 dark:border-warning-500/40 dark:bg-white/[0.03]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Entradas por costear
        </h3>
        <Badge variant="light" color={pending > 0 ? "warning" : "success"} size="sm">
          {pending} pendiente(s)
        </Badge>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Mercancía recibida cuya factura de proveedor aún no se ha cargado. Mientras tanto se
        valora al costo promedio anterior, así que la utilidad de esos productos sale
        distorsionada. Carga el costo desde aquí.
      </p>

      {msg && (
        <div className="mb-4">
          <Alert variant="success" title="Costo cargado" message={msg} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {done.length > 0
            ? "No queda ninguna entrada por costear en esta lista."
            : "Sin entradas pendientes."}
        </p>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                {["Producto", "Cantidad", "Recibida", "Registró", ""].map((h, i) => (
                  <TableCell
                    key={h || `acc-${i}`}
                    isHeader
                    className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-800 dark:text-white/90">
                    {r.product_name}
                    <span className="block text-xs text-gray-400">{r.product_sku ?? "—"}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm font-semibold text-success-600">
                    +{r.quantity}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {fmtDate(r.movement_date)}
                    <span className="block text-xs text-gray-400">
                      {r.days_waiting <= 0
                        ? "hoy"
                        : `hace ${r.days_waiting} día${r.days_waiting === 1 ? "" : "s"}`}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {r.responsible_name ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setOpen(true);
                      }}
                      className="text-sm font-medium text-brand-500 hover:text-brand-600"
                    >
                      Cargar costo
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data.count > data.rows.length && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Se muestran las {data.rows.length} más antiguas de {data.count}.{" "}
          <Link to="/inventario" className="font-medium text-brand-500 hover:text-brand-600">
            Ver todas en Inventario
          </Link>
          .
        </p>
      )}

      <CostModal
        isOpen={open}
        onClose={() => setOpen(false)}
        movement={selected}
        onSaved={onSaved}
      />
    </div>
  );
}
