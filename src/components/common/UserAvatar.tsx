/**
 * Avatar genérico de usuario (silueta sobre círculo, al estilo de la foto de perfil
 * por defecto de WhatsApp). El sistema no maneja fotos de perfil, así que se usa
 * este marcador en lugar de la foto de ejemplo que traía la plantilla.
 *
 * Va en SVG en línea (no un archivo de imagen) para que se adapte al tema claro/oscuro
 * y se vea nítido en cualquier tamaño.
 */

interface Props {
  /** Tamaño del círculo en clases Tailwind (por defecto el del header). */
  className?: string;
  /** Texto accesible. */
  label?: string;
}

export default function UserAvatar({ className = "h-11 w-11", label = "Usuario" }: Props) {
  return (
    <span className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}>
      <svg viewBox="0 0 48 48" role="img" aria-label={label} className="h-full w-full">
        <circle cx="24" cy="24" r="24" className="fill-gray-200 dark:fill-white/10" />
        <g className="fill-white dark:fill-gray-400">
          <circle cx="24" cy="18.5" r="8.5" />
          <ellipse cx="24" cy="48" rx="16" ry="18" />
        </g>
      </svg>
    </span>
  );
}
