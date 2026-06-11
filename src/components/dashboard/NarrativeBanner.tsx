import { BoltIcon } from "../../icons";

/**
 * Narrativa automatizada (data storytelling): resume en 2-5 frases lo esencial del
 * rango seleccionado. El texto lo genera el backend a partir de las cifras reales.
 */
export default function NarrativeBanner({ sentences, rangeLabel }: { sentences: string[]; rangeLabel: string }) {
  if (!sentences?.length) return null;
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-5 dark:border-brand-500/20 dark:from-brand-500/10 dark:to-white/[0.02] sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <BoltIcon className="size-6" />
        </div>
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">Resumen del periodo</h3>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-white/10 dark:text-brand-400">
              {rangeLabel}
            </span>
          </div>
          <ul className="space-y-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {sentences.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
