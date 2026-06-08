// Traduce los nombres técnicos de las variables del modelo (features) a etiquetas
// amigables en español. Se usa en la tarjeta "Variables más influyentes" y en el
// detalle "Ver datos" de los meses pronosticados.
//
// `featureLabel`  -> etiqueta corta para mostrar (barras / tabla).
// `featureHint`   -> frase explicativa para el tooltip (atributo title).
//
// Si una variable no está mapeada se devuelve su nombre técnico tal cual, así que
// añadir nuevas features al backend nunca rompe la UI (solo se ven sin traducir).

const CUSTOMER_TYPES: Record<string, string> = {
  INST: "institucional",
  CORP: "empresarial",
  IND: "particular",
};

const LABELS: Record<string, string> = {
  t: "Tendencia",
  trimestre: "Trimestre del año",
  mes_sin: "Estacionalidad (sen)",
  mes_cos: "Estacionalidad (cos)",
  roll3: "Media 3 meses",
  categoria: "Categoría del producto",
  precio_base: "Precio base",
  shock_cambiario: "Shock cambiario",
  rate_shock: "Shock cambiario",
  total_usd: "Monto del presupuesto",
  n_items: "N.º de ítems",
  includes_installation: "Incluye instalación",
  includes_delivery: "Incluye entrega",
  issued_month: "Mes de emisión",
};

const HINTS: Record<string, string> = {
  t: "Índice de tiempo: capta la tendencia general (crecimiento o descenso) a lo largo de los meses.",
  trimestre: "Trimestre del año (1 a 4): capta patrones por temporada.",
  mes_sin: "Componente seno de la codificación cíclica del mes; junto al coseno representa la estacionalidad del año.",
  mes_cos: "Componente coseno de la codificación cíclica del mes; junto al seno representa la estacionalidad del año.",
  roll3: "Promedio de los últimos 3 meses: el nivel reciente de la serie, suavizado.",
  categoria: "Categoría del mueble (codificada): el modelo aprende patrones distintos por tipo de producto.",
  precio_base: "Precio de lista del producto en USD.",
  shock_cambiario:
    "Devaluación de la tasa paralela por encima de su ritmo reciente: capta las caídas de demanda por saltos cambiarios bruscos.",
  rate_shock:
    "Devaluación de la tasa paralela por encima de su ritmo reciente, en el mes en que se emitió el presupuesto.",
  total_usd: "Monto total del presupuesto en USD.",
  n_items: "Número de ítems (líneas) del presupuesto.",
  includes_installation: "Si el presupuesto incluye el servicio de instalación.",
  includes_delivery: "Si el presupuesto incluye entrega o envío.",
  issued_month: "Mes calendario en que se emitió el presupuesto.",
};

export function featureLabel(name: string): string {
  if (!name) return name;
  if (name in LABELS) return LABELS[name];

  const lag = /^lag(\d+)$/.exec(name);
  if (lag) {
    const n = Number(lag[1]);
    return `Hace ${n} ${n === 1 ? "mes" : "meses"}`;
  }

  const cli = /^cliente_(.+)$/.exec(name);
  if (cli) return `Cliente ${CUSTOMER_TYPES[cli[1]] ?? cli[1]}`;

  return name;
}

export function featureHint(name: string): string {
  if (name in HINTS) return HINTS[name];

  const lag = /^lag(\d+)$/.exec(name);
  if (lag) {
    const n = Number(lag[1]);
    return n === 12
      ? "Valor de la serie 12 meses atrás (mismo mes del año anterior): capta la estacionalidad."
      : `Valor de la serie ${n} ${n === 1 ? "mes" : "meses"} atrás (rezago): el pasado reciente ayuda a predecir el futuro.`;
  }

  if (/^cliente_/.test(name)) return "Tipo de cliente (institucional, empresarial o particular).";

  return featureLabel(name);
}
