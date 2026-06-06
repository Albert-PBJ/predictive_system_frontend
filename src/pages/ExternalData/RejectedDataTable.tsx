import { useEffect, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import Spinner from "../../components/common/Spinner";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import Alert from "../../components/ui/alert/Alert";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  scraperDataService,
  type RejectedResponse,
  type RejectedRow,
} from "../../services/scraperDataService";
import { getApiError } from "../../services/apiError";
import type { ScraperSource } from "../../context/ScraperContext";

const PAGE_SIZE = 10;

function dash(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed || "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-VE", { year: "numeric", month: "2-digit", day: "2-digit" });
}

const COLUMNS = ["Producto", "Competidor", "Categoría", "Precio", "Motivo del descarte", "Fecha", ""];

export default function RejectedDataTable({
  source,
  reloadToken = 0,
}: {
  source: ScraperSource;
  reloadToken?: number;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<RejectedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localReload, setLocalReload] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, source]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = { page, page_size: PAGE_SIZE };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

    scraperDataService
      .listRejected(source, params)
      .then((res) => active && setData(res))
      .catch((err) => {
        if (active) {
          setError(getApiError(err, "No se pudieron cargar los datos descartados."));
          setData(null);
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [source, page, debouncedSearch, reloadToken, localReload]);

  const handleDelete = async (row: RejectedRow) => {
    const label = row.product_name?.trim() || "este registro";
    if (!window.confirm(`¿Eliminar definitivamente "${label}" de los descartados?`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      await scraperDataService.deleteRejected(source, row.id);
      setLocalReload((t) => t + 1);
    } catch (err) {
      setError(getApiError(err, "No se pudo eliminar el registro."));
    } finally {
      setDeletingId(null);
    }
  };

  const count = data?.count ?? 0;
  const numPages = data?.num_pages ?? 1;
  const rows = data?.results ?? [];

  return (
    <ComponentCard
      title="Datos descartados por la validación"
      desc="Filas que NO superaron el control de calidad (precio fuera de rango, nombre no válido, etc.). No entran a los datos limpios ni a los modelos; se conservan aquí, con su motivo, para revisión."
    >
      <div>
        <Label htmlFor="rejected-search">Búsqueda</Label>
        <Input
          type="text"
          placeholder="Buscar por producto, competidor, categoría o motivo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      <div className="mt-4 max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-gray-800">
            <TableRow>
              {COLUMNS.map((h, i) => (
                <TableCell key={h || `acc-${i}`} isHeader className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <TableRow>
                <TableCell className="px-4 py-10 text-center">
                  <div className="flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <Spinner />
                    Cargando datos…
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  {debouncedSearch
                    ? "No hay descartes que coincidan con la búsqueda."
                    : "No hay datos descartados para esta plataforma. ¡El control de calidad no rechazó nada!"}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-500 hover:underline">
                        {dash(r.product_name)}
                      </a>
                    ) : (
                      dash(r.product_name)
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{dash(r.competitor_name)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{dash(r.category)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {r.price ? `${r.price} ${r.currency ?? ""}`.trim() : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="light" color="warning" size="sm">
                      {dash(r.rejection_reason)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={deletingId === r.id}
                      className="text-sm font-medium text-error-500 hover:text-error-600 disabled:opacity-50"
                    >
                      {deletingId === r.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {count > 0 ? `Página ${data?.page ?? page} de ${numPages} · ${count} descartado(s)` : "Sin descartes"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={loading || page >= numPages}>
            Siguiente
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
}
