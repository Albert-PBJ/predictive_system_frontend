import { Link } from "react-router";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { RecentSale } from "../../services/statsService";
import { fmtUSD, fmtDate } from "../../utils/format";

/** Últimas ventas registradas (datos reales de `/stats/dashboard`). */
export default function RecentOrders({ sales }: { sales: RecentSale[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Ventas recientes</h3>
        <Link
          to="/ventas/historial"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          Ver todas
        </Link>
      </div>
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {["Cliente", "Tipo", "Fecha", "Total"].map((c, i) => (
                <TableCell
                  key={c}
                  isHeader
                  className={`py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${i === 3 ? "text-right" : "text-start"}`}
                >
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {sales.length === 0 ? (
              <TableRow>
                <TableCell className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Sin ventas recientes
                </TableCell>
              </TableRow>
            ) : (
              sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="py-3">
                    <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{s.customer}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge size="sm" variant="light" color={s.type === "INST" ? "info" : "primary"}>
                      {s.type_label}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    {fmtDate(s.date)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {fmtUSD(s.total_usd)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
