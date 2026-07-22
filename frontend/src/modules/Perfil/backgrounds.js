// ---------------------------------------------------------------------------
// Fondos oficiales de la tarjeta de jugador. "unlocked: true" para todos
// por ahora — cuando exista el sistema de logros, aquí es donde se marcará
// cada fondo como bloqueado/desbloqueado, sin tocar el resto del módulo.
// ---------------------------------------------------------------------------
export const BACKGROUNDS = [
  { id: "clasico", name: "Clásico", from: "#16261B", to: "#0F1C13", unlocked: true },
  { id: "azul", name: "Azul", from: "#1B3A5C", to: "#0F1C19", unlocked: true },
  { id: "rojo", name: "Rojo", from: "#5C1B22", to: "#0F1C13", unlocked: true },
  { id: "verde", name: "Verde", from: "#1B5C2E", to: "#0F1C13", unlocked: true },
  { id: "negro", name: "Negro", from: "#1A1A1A", to: "#000000", unlocked: true },
  { id: "oro", name: "Oro", from: "#5C4B1B", to: "#0F1C13", unlocked: true },
  { id: "diamante", name: "Diamante", from: "#1B4C5C", to: "#153542", unlocked: true },
  { id: "legendario", name: "Legendario", from: "#5C1B4B", to: "#1C0F1A", unlocked: true },
];

export function getBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}
