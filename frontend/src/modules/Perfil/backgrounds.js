// ---------------------------------------------------------------------------
// Fondos oficiales de la tarjeta de jugador. Cuáles están desbloqueados para
// CADA usuario lo dice el backend (user.unlockedBackgrounds) — aquí solo
// viven los colores y la pista de cómo se desbloquea cada uno.
//
// Si cambias los requisitos, actualízalos también en backend/src/rewards.js
// (son los que de verdad deciden el desbloqueo; esto es solo para mostrar
// el mensajito al jugador).
// ---------------------------------------------------------------------------
export const BACKGROUNDS = [
  { id: "clasico", name: "Clásico", from: "#16261B", to: "#0F1C13", hint: "De entrada" },
  { id: "azul", name: "Azul", from: "#1B3A5C", to: "#0F1C19", hint: "100 puntos" },
  { id: "rojo", name: "Rojo", from: "#5C1B22", to: "#0F1C13", hint: "300 puntos" },
  { id: "verde", name: "Verde", from: "#1B5C2E", to: "#0F1C13", hint: "600 puntos" },
  { id: "negro", name: "Negro", from: "#1A1A1A", to: "#000000", hint: "1000 puntos" },
  { id: "oro", name: "Oro", from: "#5C4B1B", to: "#0F1C13", hint: "Ser campeón 1 vez" },
  { id: "diamante", name: "Diamante", from: "#1B4C5C", to: "#153542", hint: "Ser campeón 3 veces" },
  { id: "legendario", name: "Legendario", from: "#5C1B4B", to: "#1C0F1A", hint: "Ser campeón 5 veces" },
];

export function getBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}
