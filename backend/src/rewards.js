// ---------------------------------------------------------------------------
// Recompensas — Fase 5. Cambia estos números para ajustar cuánto vale cada
// cosa, sin tocar la lógica del resto del backend.
// ---------------------------------------------------------------------------
export const POINTS_WIN = 10; // ganar un partido normal
export const POINTS_PARTICIPATION = 3; // jugar un partido y perder (o empatar)

export const BONUS_CAMPEON = 100;
export const BONUS_SUBCAMPEON = 50;
export const BONUS_SEMIFINALISTA = 20;

// Qué desbloquea cada fondo. "clasico" siempre viene desbloqueado desde el
// registro. Puedes cambiar los números, o agregar más fondos aquí si más
// adelante agregas nuevos en frontend/src/modules/Perfil/backgrounds.js
// (los ids deben coincidir).
export const BACKGROUND_UNLOCKS = [
  { id: "azul", requiredPoints: 100 },
  { id: "rojo", requiredPoints: 300 },
  { id: "verde", requiredPoints: 600 },
  { id: "negro", requiredPoints: 1000 },
  { id: "oro", requiredTitulos: 1 }, // ser campeón de un torneo
  { id: "diamante", requiredTitulos: 3 }, // ser campeón 3 veces
  { id: "legendario", requiredTitulos: 5 }, // ser campeón 5 veces
];

// Devuelve la lista completa de fondos que el jugador debería tener
// desbloqueados según sus puntos y torneos ganados actuales. Se combina
// (nunca se resta) con lo que ya tenía desbloqueado, para que bajar de
// puntos nunca le quite algo que ya se ganó.
export function computeNewlyUnlocked(points, tournamentsWon) {
  const unlocked = [];
  BACKGROUND_UNLOCKS.forEach((b) => {
    if (b.requiredPoints && points >= b.requiredPoints) unlocked.push(b.id);
    if (b.requiredTitulos && tournamentsWon >= b.requiredTitulos) unlocked.push(b.id);
  });
  return unlocked;
}
