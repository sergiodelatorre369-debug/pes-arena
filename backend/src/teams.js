// ---------------------------------------------------------------------------
// Bancos de equipos POR DEFECTO — Mejora 2: cada torneo ya no comparte un
// banco global. Estas listas se copian dentro de cada torneo cuando nace
// (Tournament.teamsBank), así que editar aquí solo afecta a los torneos
// NUEVOS que se creen después — los que ya están corriendo conservan el
// banco que les tocó al nacer, sin que se les mueva el tapete a mitad de
// competencia.
//
// COPA_TEAMS = selecciones (equipos nacionales).
// LIGA_TEAMS = clubes.
//
// Mismo truco de siempre: cambia *_COUNT al número que quieras, los
// espacios que falten se llenan solos con "Equipo N" temporal.
// ---------------------------------------------------------------------------
export const COPA_TEAM_COUNT = 32;

const COPA_NAMED_TEAMS = [
  "Argelia", "Arabia Saudita", "Australia", "Austria", "Bulgaria", "Camerún",
  "China", "Costa de Marfil", "Dinamarca", "Egipto", "Escocia", "Eslovenia",
  "Finlandia", "Gales", "Grecia", "Hungría", "Irán", "Irlanda del Norte",
  "Irlanda", "Macedonia del Norte", "Marruecos", "Nigeria", "Polonia", "Catar",
  "República Checa", "Rumania", "Rusia", "Senegal", "Serbia", "Suecia",
  "Suiza", "Ucrania",
];

export const COPA_TEAMS = Array.from(
  { length: COPA_TEAM_COUNT },
  (_, i) => COPA_NAMED_TEAMS[i] || `Selección ${i + 1}`
);

export const LIGA_TEAM_COUNT = 30;

const LIGA_NAMED_TEAMS = [
  "Real Madrid", "Barcelona", "Manchester City", "Liverpool", "Bayern Múnich",
  "PSG", "Juventus", "AC Milan", "Inter de Milán", "Boca Juniors",
  "River Plate", "Flamengo", "Arsenal", "Chelsea", "Manchester United",
  "Atlético de Madrid", "Borussia Dortmund", "Napoli", "Roma", "Porto",
  "Benfica", "Ajax", "River de Guadalajara", "Cruz Azul", "América",
  "Corinthians", "Palmeiras", "Independiente", "Racing Club", "Peñarol",
];

export const LIGA_TEAMS = Array.from(
  { length: LIGA_TEAM_COUNT },
  (_, i) => LIGA_NAMED_TEAMS[i] || `Club ${i + 1}`
);
