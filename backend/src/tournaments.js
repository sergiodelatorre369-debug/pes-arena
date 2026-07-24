// ---------------------------------------------------------------------------
// Toda la lógica "de reglamento" de Torneos vive aquí, separada de las
// rutas HTTP (server.js) — así la Fase 2 (motor de temporadas automático)
// puede llamar estas mismas funciones desde un cron, sin duplicar nada.
// ---------------------------------------------------------------------------

const GROUP_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Reparte jugadores en grupos parejos (máximo "maxGroupSize" por grupo).
export function assignGroups(userIds, maxGroupSize) {
  const shuffled = shuffle(userIds);
  const groupCount = Math.max(1, Math.ceil(shuffled.length / maxGroupSize));
  const groups = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((userId, i) => groups[i % groupCount].push(userId));
  const assignment = {};
  groups.forEach((members, i) => {
    members.forEach((userId) => (assignment[userId] = GROUP_LETTERS[i]));
  });
  return assignment; // { userId: "A" }
}

// Todos contra todos dentro de cada grupo.
export function roundRobinPairs(userIds) {
  const pairs = [];
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      pairs.push([userIds[i], userIds[j]]);
    }
  }
  return pairs;
}

// Tabla de posiciones de un grupo, a partir de sus partidos ya aprobados.
export function computeStandings(groupMembers, matches) {
  const table = {};
  groupMembers.forEach((userId) => {
    table[userId] = { userId, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
  });

  matches
    .filter((m) => m.status === "aprobado")
    .forEach((m) => {
      const a = table[m.playerAId];
      const b = table[m.playerBId];
      if (!a || !b) return;
      a.pj++; b.pj++;
      a.gf += m.scoreA; a.gc += m.scoreB;
      b.gf += m.scoreB; b.gc += m.scoreA;
      if (m.scoreA > m.scoreB) { a.pg++; a.pts += 3; b.pp++; }
      else if (m.scoreA < m.scoreB) { b.pg++; b.pts += 3; a.pp++; }
      else { a.pe++; b.pe++; a.pts += 1; b.pts += 1; }
    });

  Object.values(table).forEach((row) => (row.dg = row.gf - row.gc));

  return Object.values(table).sort(
    (x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf
  );
}

// Arma la primera ronda de eliminatorias a partir de los clasificados.
// Si el número de clasificados no es potencia de 2, los mejores puestos
// pasan directo (bye) a la siguiente ronda — simplificación de Fase 1,
// documentada para revisarse si hace falta algo más fino en el futuro.
export function seedKnockout(qualifiedIds) {
  const byes = [];
  const players = [...qualifiedIds];
  let nextPow2 = 1;
  while (nextPow2 * 2 <= players.length) nextPow2 *= 2;
  while (players.length > nextPow2) byes.push(players.shift()); // los primeros de la lista = mejores sembrados

  const pairs = [];
  for (let i = 0; i < players.length / 2; i++) {
    pairs.push([players[i], players[players.length - 1 - i]]);
  }
  return { pairs, byes };
}

export function roundName(playersRemaining) {
  if (playersRemaining <= 2) return "Final";
  if (playersRemaining <= 4) return "Semifinal";
  if (playersRemaining <= 8) return "Cuartos";
  if (playersRemaining <= 16) return "Octavos";
  return `Ronda de ${playersRemaining}`;
}
