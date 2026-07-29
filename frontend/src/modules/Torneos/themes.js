// ---------------------------------------------------------------------------
// Identidad visual por torneo (Mejora — Identidad propia). El "theme" viene
// del backend (tournament.theme); esto solo traduce ese nombre a colores.
// Para agregar un tema nuevo el día que haya un tercer tipo de torneo,
// nomás agrega una entrada aquí.
// ---------------------------------------------------------------------------
export const THEMES = {
  dorado: { accent: "#C9A227", accentDim: "#4A3D10", label: "Copa", glow: "#F5E6A8" },
  azul: { accent: "#3E8FE0", accentDim: "#12314F", label: "Liga", glow: "#9FD3FF" },
};

export function getTheme(theme) {
  return THEMES[theme] || THEMES.dorado;
}
