// Paleta de colores compartida por los gráficos de estadísticas (consistente con
// el azul de marca de TailAdmin). Se cicla cuando hay más categorías que colores.

export const PALETTE = [
  "#465fff", // brand
  "#12b76a", // verde
  "#f79009", // ámbar
  "#fb6514", // naranja
  "#7a5af8", // violeta
  "#06aed4", // cian
  "#ee46bc", // rosa
  "#eaaa08", // amarillo
  "#f04438", // rojo
  "#84cc16", // lima
  "#2e90fa", // azul claro
  "#875bf7", // púrpura
];

export function pickColors(n: number): string[] {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}
