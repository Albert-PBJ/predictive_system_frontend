import { useState } from "react";
import Button from "../ui/button/Button";
import { DownloadIcon, DocsIcon } from "../../icons";
import ImportModal from "./ImportModal";
import { dataExchangeService, type ImpexEntity } from "../../services/dataExchangeService";

interface Props {
  entity: ImpexEntity;
  label: string; // p. ej. "ventas"
  canImport: boolean; // permiso de escritura de la operación
  onImported: () => void; // recargar la página tras importar
  exportParams?: Record<string, string | number>; // filtros opcionales para el export
}

/**
 * Barra de continuidad operativa: exporta la operación a Excel e importa un archivo
 * llenado offline. Se coloca en cada módulo (Ventas, Inventario, Clientes, Presupuestos).
 */
export default function ImpexBar({ entity, label, canImport, onImported, exportParams }: Props) {
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await dataExchangeService.exportData(entity, exportParams);
    } catch {
      /* el navegador no descarga: error silencioso, el usuario puede reintentar */
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" startIcon={<DownloadIcon className="size-4" />} onClick={handleExport} disabled={exporting}>
        {exporting ? "Exportando…" : "Exportar Excel"}
      </Button>
      {canImport && (
        <Button variant="outline" size="sm" startIcon={<DocsIcon className="size-4" />} onClick={() => setImportOpen(true)}>
          Importar Excel
        </Button>
      )}
      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        entity={entity}
        label={label}
        onImported={onImported}
      />
    </div>
  );
}
