import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";

export interface RankColumn<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: T, index: number) => ReactNode;
}

interface RankTableProps<T> {
  columns: RankColumn<T>[];
  rows: T[];
  empty?: string;
  /** Numera las filas (1, 2, 3…) en una primera columna. */
  ranked?: boolean;
}

/** Tabla compacta para rankings (mejores clientes, top productos, etc.). */
export default function RankTable<T>({
  columns,
  rows,
  empty = "Sin datos para mostrar",
  ranked = false,
}: RankTableProps<T>) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  }

  const alignCls = (a?: "left" | "right") => (a === "right" ? "text-right" : "text-left");

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <Table>
        <TableHeader className="border-b border-gray-100 dark:border-gray-800">
          <TableRow>
            {ranked && (
              <TableCell isHeader className="px-3 py-2.5 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                #
              </TableCell>
            )}
            {columns.map((c) => (
              <TableCell
                key={c.key}
                isHeader
                className={`px-3 py-2.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400 ${alignCls(c.align)}`}
              >
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row, i) => (
            <TableRow key={i}>
              {ranked && (
                <TableCell className="px-3 py-2.5 text-sm font-medium text-gray-400">{i + 1}</TableCell>
              )}
              {columns.map((c) => (
                <TableCell
                  key={c.key}
                  className={`px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 ${alignCls(c.align)}`}
                >
                  {c.render ? c.render(row, i) : ((row as Record<string, ReactNode>)[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
