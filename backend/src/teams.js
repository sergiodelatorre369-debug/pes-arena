// ---------------------------------------------------------------------------
// Banco de equipos para el módulo Torneos. Para agregar, quitar o cambiar
// equipos, edita nomás esta lista — no hay que tocar ningún otro archivo.
// ---------------------------------------------------------------------------
export const TEAMS_BANK = [
  "México", "Argentina", "Brasil", "España", "Francia", "Alemania",
  "Italia", "Portugal", "Países Bajos", "Inglaterra", "Bélgica", "Croacia",
  "Uruguay", "Colombia", "Chile", "Estados Unidos", "Japón", "Corea del Sur",
  "Real Madrid", "Barcelona", "Manchester City", "Liverpool", "Bayern Múnich",
  "PSG", "Juventus", "AC Milan", "Inter de Milán", "Boca Juniors",
  "River Plate", "Flamengo",
];

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
