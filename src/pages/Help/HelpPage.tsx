import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

/** Tarjeta de una sección de ayuda. */
function HelpCard({ title, audience, children }: { title: string; audience?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {audience && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            {audience}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">{children}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <>
      <PageMeta title="Ayuda" description="Guía rápida para usar el sistema de Inversiones Maescar C.A." />
      <PageBreadcrumb pageTitle="Ayuda" />

      <p className="mb-6 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
        Bienvenido al sistema de Inversiones Maescar C.A. Esta guía rápida te ayuda a empezar. El{" "}
        <strong>menú lateral izquierdo</strong> muestra los módulos disponibles según tu rol; las secciones marcadas
        con una etiqueta solo aparecen para ciertos roles.
      </p>

      {/* Primeros pasos */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Primeros pasos</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-400">
          <li>Inicia sesión con el usuario y la contraseña que te asignó el administrador.</li>
          <li>Usa el <strong>menú lateral</strong> para abrir cada módulo; arriba a la derecha tienes tu perfil y el botón de cerrar sesión.</li>
          <li>
            Muchas pantallas tienen un filtro de fechas <strong>Desde / Hasta</strong> (la "máquina del tiempo"): al
            cambiarlo, los datos y gráficos se recalculan para ese período.
          </li>
          <li>Los listados se pueden buscar, filtrar y recorrer por páginas. Los montos van en USD con su equivalente en bolívares según la tasa vigente.</li>
          <li>Si olvidaste tu contraseña, usa el enlace <em>«¿Olvidaste tu contraseña?»</em> en la pantalla de inicio de sesión.</li>
        </ol>
      </div>

      {/* Módulos */}
      <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Módulos principales</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HelpCard title="Inicio">
          <p>Panel de control con el resumen del negocio. Cambia el rango de fechas para ver cualquier período.</p>
          <p>Cada rol ve la información relevante para su trabajo.</p>
        </HelpCard>

        <HelpCard title="Ventas">
          <p><strong>Registrar venta:</strong> elige el cliente y los productos, aplica descuentos y confirma; el stock se descuenta solo.</p>
          <p><strong>Presupuestos:</strong> crea cotizaciones (con IVA) y descárgalas en PDF.</p>
          <p><strong>Historial</strong> y <strong>Clientes</strong> para consultar ventas y gestionar la cartera.</p>
        </HelpCard>

        <HelpCard title="Inventario">
          <p>Consulta las existencias y su estado (disponible, stock bajo, sin stock), con gráficos de resumen.</p>
          <p>El encargado de inventario registra <strong>entradas, ajustes y devoluciones</strong>.</p>
        </HelpCard>

        <HelpCard title="Productos" audience="Gerente / Admin">
          <p>Administra el catálogo: alta y edición de productos, precios, materiales y mínimos de stock.</p>
        </HelpCard>

        <HelpCard title="Estadísticas" audience="Gerente / Admin">
          <p>Paneles descriptivos del estado actual: clientes, productos, ventas y presupuestos.</p>
        </HelpCard>

        <HelpCard title="Predicciones" audience="Gerente / Admin">
          <p>Pronósticos de demanda, ventas, utilidad, precios y reabastecimiento, con gráficos interactivos.</p>
          <p>Puedes reentrenar los modelos desde el panel cuando carguen nuevos datos.</p>
        </HelpCard>

        <HelpCard title="Benchmarking competitivo" audience="Gerente / Admin">
          <p>Compara tus precios con los de la competencia (datos recolectados), por categoría y por producto.</p>
        </HelpCard>

        <HelpCard title="Administración" audience="Admin">
          <p><strong>Datos externos:</strong> ejecuta los recolectores de precios de la competencia.</p>
          <p><strong>Configuración:</strong> parámetros del sistema (tasa, IVA, integraciones).</p>
          <p><strong>Auditoría:</strong> registro de quién hizo qué y cuándo.</p>
        </HelpCard>
      </div>

      <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        ¿Tienes dudas adicionales o un problema técnico? Contacta al administrador del sistema.
      </p>
    </>
  );
}
