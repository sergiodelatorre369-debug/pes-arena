// ---------------------------------------------------------------------------
// Banco de equipos para el módulo Torneos.
//
// 1. Cambia TEAM_COUNT al número de equipos que quieras tener disponibles
//    (ej. 12, 30, 48 — el que sea).
// 2. Ve llenando NAMED_TEAMS con los nombres reales que quieras usar.
//    NO hace falta que estén completos: los espacios que falten se llenan
//    solos con "Equipo N" temporal, para que SIEMPRE haya exactamente
//    TEAM_COUNT equipos disponibles, ni uno más ni uno menos.
// 3. Si NAMED_TEAMS tiene más nombres que TEAM_COUNT, los de más se
//    ignoran (no hace falta borrarlos, puedes dejarlos guardados por si
//    subes el número después).
// ---------------------------------------------------------------------------
export const TEAM_COUNT = 30;

const NAMED_TEAMS = [
  "México", "Argentina", "Brasil", "España", "Francia", "Alemania",
  "Italia", "Portugal", "Países Bajos", "Inglaterra", "Bélgica", "Croacia",
  "Uruguay", "Colombia", "Chile", "Estados Unidos", "Japón", "Corea del Sur",
  "Real Madrid", "Barcelona", "Manchester City", "Liverpool", "Bayern Múnich",
  "PSG", "Juventus", "AC Milan", "Inter de Milán", "Boca Juniors",
  "River Plate", "Flamengo",
];

export const TEAMS_BANK = Array.from(
  { length: TEAM_COUNT },
  (_, i) => NAMED_TEAMS[i] || `Equipo ${i + 1}`
);

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Reparte equipos al azar entre "count" jugadores. Si hay más jugadores que
// equipos en el banco, algunos se repiten (mejor eso a que falte alguno).
export function assignTeams(count) {
  const shuffled = shuffle(TEAMS_BANK);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}
