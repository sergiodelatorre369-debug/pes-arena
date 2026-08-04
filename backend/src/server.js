import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";
import { prisma } from "./db.js";
import { hashPassword, comparePassword, signToken, authMiddleware, publicUser } from "./auth.js";
import { assignGroups, roundRobinPairs, computeStandings, seedKnockout, roundName, statsForPlayer, assignTeamsFromBank } from "./tournaments.js";
import { COPA_TEAMS, LIGA_TEAMS } from "./teams.js";
import { POINTS_WIN, POINTS_PARTICIPATION, BONUS_CAMPEON, BONUS_SUBCAMPEON, BONUS_SEMIFINALISTA, computeNewlyUnlocked } from "./rewards.js";

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const QUEUE_STALE_MS = 3 * 60 * 1000; // 3 minutos esperando = se cae de la cola
const ROOM_CLEANUP_MS = 5 * 60 * 1000; // cuánto se guarda una sala cerrada antes de borrarla

// ---------------------------------------------------------------------------
// Estado en memoria. Fase 1 = solo invitados, sin base de datos todavía.
// Si despliegas varias instancias del backend, este estado NO se comparte
// entre ellas (necesitarías Redis). Para un solo servidor, esto es correcto.
// ---------------------------------------------------------------------------
let queue = []; // { socketId, nickname, joinedAt }
const rooms = new Map(); // roomId -> { id, players, messages, status, createdAt }

function uid() {
  return crypto.randomBytes(6).toString("hex");
}

function cleanQueue() {
  const now = Date.now();
  queue = queue.filter((p) => now - p.joinedAt < QUEUE_STALE_MS);
}

function removeFromQueue(socketId) {
  queue = queue.filter((p) => p.socketId !== socketId);
}

function publicQueue(excludeSocketId) {
  cleanQueue();
  return queue
    .filter((p) => p.socketId !== excludeSocketId)
    .map((p) => ({ socketId: p.socketId, nickname: p.nickname, joinedAt: p.joinedAt }));
}

function createRoom(playerA, playerB) {
  const roomId = uid();
  const room = {
    id: roomId,
    players: [
      { socketId: playerA.socketId, nickname: playerA.nickname, ip: "" },
      { socketId: playerB.socketId, nickname: playerB.nickname, ip: "" },
    ],
    messages: [
      {
        id: uid(),
        type: "system",
        text: `Sala creada: ${playerA.nickname} vs ${playerB.nickname}`,
        ts: Date.now(),
      },
    ],
    status: "active",
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
}

// ---------------------------------------------------------------------------
// HTTP app: health check + rutas de cuentas (Fase 2). El matchmaking en
// tiempo real sigue siendo 100% por Socket.IO, sin tocarse.
// ---------------------------------------------------------------------------
const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
// Ninguna respuesta de esta API debe guardarse en caché — ni el navegador
// ni ningún intermediario. Sin esto, a veces una pantalla muestra datos
// viejos aunque la base de datos ya esté actualizada.
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  next();
});

app.get("/health", (req, res) => {
  cleanQueue();
  res.json({ ok: true, enCola: queue.length, salasActivas: rooms.size });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, countryCode, countryName, countryFlag } = req.body || {};
    if (!username || !username.trim() || !password || password.length < 4) {
      return res.status(400).json({ error: "Apodo y contraseña (mínimo 4 caracteres) son obligatorios." });
    }
    const clean = username.trim().slice(0, 20);
    const existing = await prisma.user.findUnique({ where: { username: clean } });
    if (existing) {
      return res.status(409).json({ error: "Ese apodo ya está registrado." });
    }
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username: clean, passwordHash, countryCode, countryName, countryFlag },
    });
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Error en /api/auth/register:", err);
    res.status(500).json({ error: "No se pudo crear la cuenta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await prisma.user.findUnique({ where: { username: (username || "").trim() } });
    if (!user || !(await comparePassword(password || "", user.passwordHash))) {
      return res.status(401).json({ error: "Apodo o contraseña incorrectos." });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Error en /api/auth/login:", err);
    res.status(500).json({ error: "No se pudo iniciar sesión." });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Error en /api/auth/me:", err);
    res.status(500).json({ error: "No se pudo cargar el perfil." });
  }
});

// Actualiza foto de perfil y/o fondo de la tarjeta. Solo toca los campos
// que vengan en el body, para poder usarse tanto desde "cambiar foto"
// como desde "elegir fondo" sin duplicar rutas.
app.patch("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { photoUrl, background } = req.body || {};
    const data = {};
    if (typeof photoUrl === "string") {
      if (photoUrl.length > 300000) {
        return res.status(400).json({ error: "La foto es muy pesada. Intenta con una más chica." });
      }
      data.photoUrl = photoUrl;
    }
    if (typeof background === "string") {
      const current = await prisma.user.findUnique({ where: { id: req.userId } });
      const unlocked = current?.unlockedBackgrounds || ["clasico"];
      if (!unlocked.includes(background)) {
        return res.status(400).json({ error: "Todavía no has desbloqueado ese fondo." });
      }
      data.background = background;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No hay nada que actualizar." });
    }
    const user = await prisma.user.update({ where: { id: req.userId }, data });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Error en /api/profile:", err);
    res.status(500).json({ error: "No se pudo actualizar el perfil." });
  }
});

// ---------------------------------------------------------------------------
// Módulo Torneos — Fase 1 (Copa). La automatización por fechas/semanas real
// (el "motor de temporadas" del documento) es la Fase 2 — por ahora cada
// torneo avanza de fase solo en cuanto se cumple su condición (llenar el
// cupo mínimo, o que todos los partidos de la ronda actual se aprueben),
// sin depender de que un admin mueva nada a mano.
// ---------------------------------------------------------------------------

async function withPlayers(list, idFields) {
  const ids = new Set();
  list.forEach((row) => idFields.forEach((f) => row[f] && ids.add(row[f])));
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } } });
  const byId = Object.fromEntries(users.map((u) => [u.id, publicUser(u)]));
  return byId;
}

// Devuelve { userId: "Real Madrid" } — el equipo asignado a cada jugador
// dentro de ESE torneo (no es un dato del perfil, cambia por torneo).
async function withTeams(tournamentId, userIds) {
  const entries = await prisma.tournamentEntry.findMany({
    where: { tournamentId, userId: { in: [...new Set(userIds)] } },
  });
  return Object.fromEntries(entries.map((e) => [e.userId, e.team]));
}

// Noticias del Torneo: un historial simple de eventos, para que el módulo
// se sienta vivo. No dispara nada más — solo se guarda y se muestra.
async function addNews(tournamentId, text) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return;
  const news = [...(t.news || []), { id: crypto.randomUUID(), text, ts: Date.now() }].slice(-50);
  await prisma.tournament.update({ where: { id: tournamentId }, data: { news } });
}

async function adjustConfiabilidad(userId, delta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const next = Math.max(0, Math.min(100, user.confiabilidad + delta));
  await prisma.user.update({ where: { id: userId }, data: { confiabilidad: next } });
}

// Fase 5 — Recompensas. Suma puntos y revisa si con eso se desbloquea
// algún fondo nuevo (nunca quita fondos ya ganados, aunque bajen los puntos).
async function addPoints(userId, delta) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const points = Math.max(0, user.points + delta);
  const newlyUnlocked = computeNewlyUnlocked(points, user.tournamentsWon);
  const unlockedBackgrounds = [...new Set([...(user.unlockedBackgrounds || []), ...newlyUnlocked])];
  await prisma.user.update({ where: { id: userId }, data: { points, unlockedBackgrounds } });
}

async function addTitle(userId, text) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const titles = [...(user.titles || []), { id: crypto.randomUUID(), text, ts: Date.now() }].slice(-20);
  await prisma.user.update({ where: { id: userId }, data: { titles } });
}

async function incrementTournamentsWon(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const tournamentsWon = user.tournamentsWon + 1;
  const newlyUnlocked = computeNewlyUnlocked(user.points, tournamentsWon);
  const unlockedBackgrounds = [...new Set([...(user.unlockedBackgrounds || []), ...newlyUnlocked])];
  await prisma.user.update({ where: { id: userId }, data: { tournamentsWon, unlockedBackgrounds } });
}

// Reparte los puntos de UN partido ya aprobado. "forcedWinnerId" se usa en
// las victorias por inasistencia (gana quien sí se presentó, sin importar
// qué marcador haya escrito). Si nadie participó de verdad, no se reparte
// nada — "se castiga abandonar, no perder".
async function awardMatchPoints(match, { participatedA = true, participatedB = true, forcedWinnerId = null } = {}) {
  if (match.playerAId === match.playerBId) return; // bye técnico, no fue un partido real
  if (!participatedA && !participatedB) return;

  let winnerId = forcedWinnerId;
  if (!winnerId) {
    winnerId = match.scoreA > match.scoreB ? match.playerAId : match.scoreB > match.scoreA ? match.playerBId : null;
  }
  const loserId = !winnerId ? null : winnerId === match.playerAId ? match.playerBId : match.playerAId;

  if (winnerId) {
    await addPoints(winnerId, POINTS_WIN);
    if (loserId && participatedA && participatedB) await addPoints(loserId, POINTS_PARTICIPATION);
  } else if (participatedA && participatedB) {
    await addPoints(match.playerAId, POINTS_PARTICIPATION);
    await addPoints(match.playerBId, POINTS_PARTICIPATION);
  }
}

// Bonos de fin de torneo: campeón, subcampeón y semifinalistas. Se llama
// justo cuando el torneo pasa a "finalizado".
async function awardTournamentBonuses(tournamentId, championId) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const label = tournament?.name || "el torneo";

  if (championId) {
    await addPoints(championId, BONUS_CAMPEON);
    await addTitle(championId, `🏆 Campeón — ${label}`);
    await incrementTournamentsWon(championId);
  }

  const finalMatch = await prisma.tournamentMatch.findFirst({
    where: { tournamentId, phase: "knockout", round: "Final", status: "aprobado" },
  });
  if (finalMatch && finalMatch.playerAId !== finalMatch.playerBId) {
    const runnerUpId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.playerBId : finalMatch.playerAId;
    await addPoints(runnerUpId, BONUS_SUBCAMPEON);
    await addTitle(runnerUpId, `🥈 Subcampeón — ${label}`);
  }

  const semis = await prisma.tournamentMatch.findMany({
    where: { tournamentId, phase: "knockout", round: "Semifinal", status: "aprobado" },
  });
  for (const m of semis) {
    if (m.playerAId === m.playerBId) continue;
    const loserId = m.scoreA > m.scoreB ? m.playerBId : m.playerAId;
    await addPoints(loserId, BONUS_SEMIFINALISTA);
    await addTitle(loserId, `🥉 Semifinalista — ${label}`);
  }
}

const CONFLICT_TRUST_GAP = 10; // diferencia de Confiabilidad para creerle a uno de los dos sin dudar

function activityCount(match, username) {
  return (match.messages || []).filter((m) => m.from === username).length;
}

// Sistema de Evidencias + Confiabilidad, ya trabajando juntos: intenta
// resolver un conflicto de marcador de inmediato. Si no se puede decidir
// con justicia todavía (empate total en las señales), se queda en
// "conflicto" esperando el plazo — ver resolveExpiredMatches.
async function tryResolveConflict(match) {
  const [userA, userB] = await Promise.all([
    prisma.user.findUnique({ where: { id: match.playerAId } }),
    prisma.user.findUnique({ where: { id: match.playerBId } }),
  ]);
  if (!userA || !userB) return null;

  const confDiff = userA.confiabilidad - userB.confiabilidad;
  let trusted = null;
  if (Math.abs(confDiff) >= CONFLICT_TRUST_GAP) {
    trusted = confDiff > 0 ? "A" : "B";
  } else {
    const activityA = activityCount(match, userA.username);
    const activityB = activityCount(match, userB.username);
    if (activityA !== activityB) trusted = activityA > activityB ? "A" : "B";
  }

  if (!trusted) return null; // empate total en las señales — se espera al plazo

  const trustedReport = trusted === "A" ? match.reportA : match.reportB;
  const trustedId = trusted === "A" ? match.playerAId : match.playerBId;
  const otherId = trusted === "A" ? match.playerBId : match.playerAId;

  const updated = await prisma.tournamentMatch.update({
    where: { id: match.id },
    data: {
      status: "aprobado",
      scoreA: trustedReport.scoreA,
      scoreB: trustedReport.scoreB,
      approvedAt: new Date(),
      autoResolved: true,
      messages: [
        ...(match.messages || []),
        {
          id: crypto.randomUUID(),
          type: "system",
          text: "⚖️ Los marcadores no coincidían — se resolvió automático usando Confiabilidad y actividad en el chat.",
          ts: Date.now(),
        },
      ],
    },
  });
  await adjustConfiabilidad(trustedId, 3);
  await adjustConfiabilidad(otherId, -5);
  await awardMatchPoints(updated);

  const byId = await withPlayers([updated], ["playerAId", "playerBId"]);
  const nameA = byId[updated.playerAId]?.username || "Jugador A";
  const nameB = byId[updated.playerBId]?.username || "Jugador B";
  await addNews(match.tournamentId, `⚖️ ${nameA} ${updated.scoreA}-${updated.scoreB} ${nameB} (conflicto resuelto)`);
  await maybeAdvanceTournament(match.tournamentId);
  return updated;
}

// ---------------------------------------------------------------------------
// Fase 2/4 — Motor de temporadas + Validación Inteligente: revisa partidos
// vencidos y los decide solo.
//   - Pendientes (nadie resolvió el marcador): reportó uno solo -> ese gana;
//     no reportó ninguno -> 0-0 y castigo de Confiabilidad a los dos.
//   - En conflicto (empate total en Confiabilidad/actividad, nadie se pudo
//     creer más que al otro): al vencer el plazo, se toma el número más
//     bajo que ambos reportes coincidan para cada marcador — así nadie se
//     beneficia de haber inflado su propio resultado.
// ---------------------------------------------------------------------------
const AUSENCIA_PENALTY = 15;
const INACTIVIDAD_PENALTY = 8;
const CONFLICTO_SIN_RESOLVER_PENALTY = 5;

// Resuelve UN partido que ya se quedó sin tiempo — reutilizable tanto por
// el barrido cada hora como por el cierre forzoso de fase (cuando llega el
// lunes y algo se quedó sin jugarse).
async function autoResolveOneMatch(m) {
  const now = new Date();
  let scoreA, scoreB, note;
  let awardOpts = {};

  if (m.status === "conflicto") {
    scoreA = Math.min(m.reportA.scoreA, m.reportB.scoreA);
    scoreB = Math.min(m.reportA.scoreB, m.reportB.scoreB);
    note = "⏰ El conflicto no se resolvió a tiempo. Se toma el marcador más conservador en el que ambos reportes coinciden.";
    await adjustConfiabilidad(m.playerAId, -CONFLICTO_SIN_RESOLVER_PENALTY);
    await adjustConfiabilidad(m.playerBId, -CONFLICTO_SIN_RESOLVER_PENALTY);
  } else {
    const aReported = !!m.reportA;
    const bReported = !!m.reportB;
    if (aReported && !bReported) {
      scoreA = m.reportA.scoreA;
      scoreB = m.reportA.scoreB;
      note = "⏰ Se venció el plazo. El jugador B no reportó — gana el jugador A por inasistencia.";
      awardOpts = { forcedWinnerId: m.playerAId, participatedB: false };
      await adjustConfiabilidad(m.playerBId, -AUSENCIA_PENALTY);
    } else if (bReported && !aReported) {
      scoreA = m.reportB.scoreA;
      scoreB = m.reportB.scoreB;
      note = "⏰ Se venció el plazo. El jugador A no reportó — gana el jugador B por inasistencia.";
      awardOpts = { forcedWinnerId: m.playerBId, participatedA: false };
      await adjustConfiabilidad(m.playerAId, -AUSENCIA_PENALTY);
    } else {
      scoreA = 0;
      scoreB = 0;
      const aActive = !!m.lastActiveA;
      const bActive = !!m.lastActiveB;
      note = "⏰ Se venció el plazo y ninguno reportó el resultado. Queda como empate técnico 0-0.";
      awardOpts = { participatedA: false, participatedB: false };
      await adjustConfiabilidad(m.playerAId, aActive ? -INACTIVIDAD_PENALTY : -AUSENCIA_PENALTY);
      await adjustConfiabilidad(m.playerBId, bActive ? -INACTIVIDAD_PENALTY : -AUSENCIA_PENALTY);
    }
  }

  const messages = [...(m.messages || []), { id: crypto.randomUUID(), type: "system", text: note, ts: Date.now() }];
  const updated = await prisma.tournamentMatch.update({
    where: { id: m.id },
    data: { status: "aprobado", scoreA, scoreB, approvedAt: now, autoResolved: true, messages },
  });
  await awardMatchPoints(updated, awardOpts);

  const byId = await withPlayers([m], ["playerAId", "playerBId"]);
  const nameA = byId[m.playerAId]?.username || "Jugador A";
  const nameB = byId[m.playerBId]?.username || "Jugador B";
  await addNews(m.tournamentId, `⏰ ${nameA} ${scoreA}-${scoreB} ${nameB} (resultado automático)`);
  return updated;
}

async function resolveExpiredMatches() {
  const now = new Date();
  const expiredPending = await prisma.tournamentMatch.findMany({
    where: { status: "pendiente", deadline: { lte: now } },
  });
  const realExpired = expiredPending.filter((m) => m.playerAId !== m.playerBId);
  for (const m of realExpired) await autoResolveOneMatch(m);

  const expiredConflicts = await prisma.tournamentMatch.findMany({
    where: { status: "conflicto", deadline: { lte: now } },
  });
  const realConflicts = expiredConflicts.filter((x) => x.playerAId !== x.playerBId);
  for (const m of realConflicts) await autoResolveOneMatch(m);

  // Avisos de "se acaba el tiempo" — una sola vez por partido, dentro de su propia Sala.
  const soon = new Date(now.getTime() + 24 * 3600 * 1000);
  const upcoming = await prisma.tournamentMatch.findMany({
    where: { status: "pendiente", reminderSent: false, deadline: { gt: now, lte: soon } },
  });
  for (const m of upcoming.filter((x) => x.playerAId !== x.playerBId)) {
    const messages = [
      ...(m.messages || []),
      { id: crypto.randomUUID(), type: "system", text: "⏰ Queda menos de 1 día para el plazo de este partido.", ts: Date.now() },
    ];
    await prisma.tournamentMatch.update({ where: { id: m.id }, data: { reminderSent: true, messages } });
  }

  // Avisos a nivel torneo: "quedan X días para..." — una vez por corte de fase.
  const soon2 = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const soonTournaments = await prisma.tournament.findMany({
    where: { status: { not: "finalizado" }, phaseReminderSent: false, phaseDeadline: { gt: now, lte: soon2 } },
  });
  const PHASE_EVENT_LABEL = {
    inscripciones: "cierren las inscripciones",
    grupos: "termine la fase de grupos",
    eliminatorias: "termine esta ronda de eliminatorias",
  };
  for (const t of soonTournaments) {
    const days = Math.max(1, Math.ceil((new Date(t.phaseDeadline).getTime() - now.getTime()) / (24 * 3600 * 1000)));
    const label = PHASE_EVENT_LABEL[t.status] || "el próximo corte";
    await addNews(t.id, `⏰ Quedan ${days} día(s) para que ${label} de ${t.name}.`);
    await prisma.tournament.update({ where: { id: t.id }, data: { phaseReminderSent: true } });
  }

  // Reloj semanal: revisa TODOS los torneos activos, no solo los que
  // tuvieron partidos vencidos ahorita — inscripciones no tiene partidos
  // que vencer, pero igual necesita que se le revise su fecha de corte.
  const allActive = await prisma.tournament.findMany({ where: { status: { not: "finalizado" } } });
  for (const t of allActive) await maybeAdvanceTournament(t.id);

  return { resolved: realExpired.length, conflictsResolved: realConflicts.length, reminders: upcoming.length };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Próximo lunes a partir de una fecha (si hoy ya es lunes, salta a la
// semana siguiente, para que las inscripciones tengan al menos unos días).
function nextMonday(from) {
  const d = new Date(from);
  const day = d.getDay(); // 0 = domingo, 1 = lunes...
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(9, 0, 0, 0);
  return d;
}

const GROUP_STAGE_WEEKS = { copa: 1, liga: 4 }; // Copa: 1 semana de grupos. Liga: 4 semanas.

async function ensureActiveTournament() {
  const activeCopa = await prisma.tournament.findFirst({
    where: { type: "copa", status: { not: "finalizado" } },
    orderBy: { createdAt: "desc" },
  });
  if (!activeCopa) {
    const priorCount = await prisma.tournament.count({ where: { type: "copa" } });
    await prisma.tournament.create({
      data: {
        name: "Copa PES ARENA",
        type: "copa",
        minPlayers: 4,
        maxGroupSize: 4,
        advancePerGroup: 2,
        theme: "dorado",
        edition: priorCount + 1,
        teamsBank: COPA_TEAMS,
        phaseDeadline: nextMonday(new Date()),
      },
    });
  } else {
    const repair = {};
    if (!activeCopa.teamsBank || activeCopa.teamsBank.length === 0) repair.teamsBank = COPA_TEAMS;
    if (!activeCopa.theme) repair.theme = "dorado";
    if (!activeCopa.phaseDeadline) {
      repair.phaseDeadline = nextMonday(new Date());
      repair.phaseReminderSent = false;
    }
    if (Object.keys(repair).length > 0) {
      await prisma.tournament.update({ where: { id: activeCopa.id }, data: repair });
    }
  }

  const activeLiga = await prisma.tournament.findFirst({
    where: { type: "liga", status: { not: "finalizado" } },
    orderBy: { createdAt: "desc" },
  });
  if (!activeLiga) {
    const priorCount = await prisma.tournament.count({ where: { type: "liga" } });
    // maxGroupSize gigante = todos caen en un solo grupo = todos contra todos.
    await prisma.tournament.create({
      data: {
        name: "Liga PES ARENA",
        type: "liga",
        minPlayers: 4,
        maxGroupSize: 9999,
        advancePerGroup: 4,
        theme: "azul",
        edition: priorCount + 1,
        teamsBank: LIGA_TEAMS,
        phaseDeadline: nextMonday(new Date()),
      },
    });
  } else {
    const repair = {};
    if (!activeLiga.teamsBank || activeLiga.teamsBank.length === 0) repair.teamsBank = LIGA_TEAMS;
    if (!activeLiga.theme) repair.theme = "azul";
    if (!activeLiga.phaseDeadline) {
      repair.phaseDeadline = nextMonday(new Date());
      repair.phaseReminderSent = false;
    }
    if (Object.keys(repair).length > 0) {
      await prisma.tournament.update({ where: { id: activeLiga.id }, data: repair });
    }
  }
}


async function maybeAdvanceTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  // Torneo de antes de que existiera el reloj semanal — se le asigna uno y
  // se revisa la próxima vez (así nunca se queda pegado para siempre).
  if (!tournament.phaseDeadline) {
    let fallback;
    if (tournament.status === "inscripciones") {
      fallback = nextMonday(new Date());
    } else {
      const nearest = await prisma.tournamentMatch.findFirst({
        where: { tournamentId, status: "pendiente", deadline: { not: null } },
        orderBy: { deadline: "asc" },
      });
      fallback = nearest?.deadline || nextMonday(new Date());
    }
    await prisma.tournament.update({ where: { id: tournamentId }, data: { phaseDeadline: fallback, phaseReminderSent: false } });
    return;
  }

  const now = new Date();
  if (tournament.phaseDeadline > now) return; // todavía no llega el lunes de corte

  if (tournament.status === "inscripciones") {
    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId } });
    if (entries.length < 2) {
      // no se juntó ni para un partido — se extiende una semana más, sin castigar a nadie
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { phaseDeadline: addDays(tournament.phaseDeadline, 7), phaseReminderSent: false },
      });
      await addNews(tournamentId, `⏳ No se juntaron suficientes jugadores para ${tournament.name}. Las inscripciones se extienden una semana más.`);
      return;
    }

    const assignment = assignGroups(entries.map((e) => e.userId), tournament.maxGroupSize);
    const teams = assignTeamsFromBank(tournament.teamsBank, entries.length);
    await Promise.all(
      entries.map((e, i) =>
        prisma.tournamentEntry.update({
          where: { id: e.id },
          data: { groupName: assignment[e.userId], team: teams[i] },
        })
      )
    );
    const groups = {};
    Object.entries(assignment).forEach(([userId, g]) => {
      groups[g] = groups[g] || [];
      groups[g].push(userId);
    });
    const isLiga = tournament.type === "liga";
    const weeks = GROUP_STAGE_WEEKS[tournament.type] || 1;
    const newDeadline = addDays(tournament.phaseDeadline, 7 * weeks);
    const matchData = [];
    Object.entries(groups).forEach(([groupName, members]) => {
      roundRobinPairs(members).forEach(([a, b]) => {
        const round = isLiga ? "Liga" : `Grupo ${groupName}`;
        matchData.push({ tournamentId, phase: "grupos", round, playerAId: a, playerBId: b, deadline: newDeadline });
      });
    });
    await prisma.tournamentMatch.createMany({ data: matchData });
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "grupos", phaseDeadline: newDeadline, phaseReminderSent: false },
    });
    await addNews(
      tournamentId,
      isLiga
        ? `🌐 ¡Arrancó la Liga! ${entries.length} jugadores, todos contra todos durante ${weeks} semanas.`
        : `⚽ ¡Comenzó la fase de grupos! ${entries.length} jugadores, una semana para jugarla.`
    );
    return;
  }

  if (tournament.status === "grupos") {
    // Ya es lunes de corte — lo que siga pendiente o en conflicto se
    // resuelve solo, ahorita mismo, para que la fase sí cierre hoy.
    const groupMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId, phase: "grupos" } });
    for (const m of groupMatches) {
      if (m.status === "pendiente" || m.status === "conflicto") await autoResolveOneMatch(m);
    }
    const resolvedMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId, phase: "grupos" } });

    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId } });
    const byGroup = {};
    entries.forEach((e) => {
      byGroup[e.groupName] = byGroup[e.groupName] || [];
      byGroup[e.groupName].push(e.userId);
    });
    const qualified = [];
    Object.values(byGroup).forEach((members) => {
      const matches = resolvedMatches.filter((m) => members.includes(m.playerAId));
      const table = computeStandings(members, matches);
      qualified.push(...table.slice(0, tournament.advancePerGroup).map((row) => row.userId));
    });

    const newDeadline = addDays(tournament.phaseDeadline, 7);

    if (qualified.length <= 1) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "finalizado", championId: qualified[0] || null },
      });
      if (qualified[0]) {
        const champ = await prisma.user.findUnique({ where: { id: qualified[0] } });
        await addNews(tournamentId, `🏆 ¡${champ?.username || "Un jugador"} es el campeón del torneo!`);
        await awardTournamentBonuses(tournamentId, qualified[0]);
      }
      return;
    }

    const { pairs, byes } = seedKnockout(qualified);
    const round = roundName(qualified.length);
    const matchData = pairs.map(([a, b]) => ({ tournamentId, phase: "knockout", round, playerAId: a, playerBId: b, deadline: newDeadline }));
    await prisma.tournamentMatch.createMany({ data: matchData });
    // Los jugadores con bye avanzan directo: se guardan como partido ya aprobado contra sí mismos
    // para que el cálculo de "ronda actual" los cuente como ganadores sin jugar.
    await Promise.all(
      byes.map((userId) =>
        prisma.tournamentMatch.create({
          data: { tournamentId, phase: "knockout", round, playerAId: userId, playerBId: userId, status: "aprobado", scoreA: 1, scoreB: 0 },
        })
      )
    );
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "eliminatorias", phaseDeadline: newDeadline, phaseReminderSent: false },
    });
    await addNews(tournamentId, `🏟️ Terminó la fase de grupos. ¡Ya están definidos los cruces de ${round}! Una semana para jugarlas.`);
    return;
  }

  if (tournament.status === "eliminatorias") {
    // Ya se venció la semana de eliminatorias — fuerza lo que siga pendiente.
    const openMatches = await prisma.tournamentMatch.findMany({
      where: { tournamentId, phase: "knockout", status: { in: ["pendiente", "conflicto"] } },
    });
    for (const m of openMatches) {
      if (m.playerAId !== m.playerBId) await autoResolveOneMatch(m);
    }

    const allKnockout = await prisma.tournamentMatch.findMany({
      where: { tournamentId, phase: "knockout" },
      orderBy: { createdAt: "desc" },
    });
    if (allKnockout.length === 0) return;
    const latestRound = allKnockout[0].round;
    const currentRoundMatches = allKnockout.filter((m) => m.round === latestRound);
    const winners = currentRoundMatches.map((m) => (m.scoreA >= m.scoreB ? m.playerAId : m.playerBId));

    if (winners.length <= 1) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "finalizado", championId: winners[0] || null },
      });
      if (winners[0]) {
        const champ = await prisma.user.findUnique({ where: { id: winners[0] } });
        await addNews(tournamentId, `🏆 ¡${champ?.username || "Un jugador"} es el campeón del torneo!`);
        await awardTournamentBonuses(tournamentId, winners[0]);
      }
      return;
    }

    // Todavía faltan rondas — se generan, con una semana más para jugarlas
    // (si un torneo tiene muchas rondas, puede tomar más de una semana en
    // total de eliminatorias; mejor eso a dejarlo trabado).
    const newDeadline = addDays(tournament.phaseDeadline, 7);
    const { pairs, byes } = seedKnockout(winners);
    const round = roundName(winners.length);
    const matchData = pairs.map(([a, b]) => ({ tournamentId, phase: "knockout", round, playerAId: a, playerBId: b, deadline: newDeadline }));
    await prisma.tournamentMatch.createMany({ data: matchData });
    await Promise.all(
      byes.map((userId) =>
        prisma.tournamentMatch.create({
          data: { tournamentId, phase: "knockout", round, playerAId: userId, playerBId: userId, status: "aprobado", scoreA: 1, scoreB: 0 },
        })
      )
    );
    await prisma.tournament.update({ where: { id: tournamentId }, data: { phaseDeadline: newDeadline, phaseReminderSent: false } });
    await addNews(tournamentId, `🔥 ¡Ya están definidos los cruces de ${round}! Una semana más para jugarlos.`);
  }
}

// Mejora 2: ya no existe un Banco de Equipos global — cada torneo trae el
// suyo dentro de su propio registro (tournament.teamsBank), que ya viaja
// en las respuestas de /api/tournaments y /api/tournaments/:id de abajo.

// Sorteo Oficial PES ARENA: consulta tu inscripción (equipo asignado y si
// ya viste la animación de la ruleta) y marca que ya la viste.
app.get("/api/tournaments/:id/my-entry", authMiddleware, async (req, res) => {
  try {
    const entry = await prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: req.params.id, userId: req.userId } },
    });
    res.json({ entry: entry || null });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/my-entry:", err);
    res.status(500).json({ error: "No se pudo cargar tu inscripción." });
  }
});

app.post("/api/tournaments/:id/sorteo-visto", authMiddleware, async (req, res) => {
  try {
    const entry = await prisma.tournamentEntry.update({
      where: { tournamentId_userId: { tournamentId: req.params.id, userId: req.userId } },
      data: { sorteoSeen: true },
    });
    res.json({ entry });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/sorteo-visto:", err);
    res.status(500).json({ error: "No se pudo actualizar." });
  }
});

// Fase 2 — a esta ruta le toca la puerta el Cron Job de Render cada hora.
// Protegida con un secreto propio (no el mismo JWT de los usuarios) porque
// no la llama una persona con sesión, la llama un robot con horario.
app.post("/api/cron/check-deadlines", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "No autorizado." });
  }
  try {
    const result = await resolveExpiredMatches();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Error en /api/cron/check-deadlines:", err);
    res.status(500).json({ error: "Falló la revisión de plazos." });
  }
});

// Mejora 1 — Lobby de Torneos: campeón vigente (de la edición anterior),
// cupo y cuándo vence el próximo partido pendiente de ESTE torneo.
async function enrichTournament(t, participantCount) {
  const prevFinal = await prisma.tournament.findFirst({
    where: { type: t.type, status: "finalizado", id: { not: t.id }, championId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  let defendingChampion = null;
  if (prevFinal?.championId) {
    const champ = await prisma.user.findUnique({ where: { id: prevFinal.championId } });
    defendingChampion = champ?.username || null;
  }
  return {
    ...t,
    participantCount,
    cupo: t.minPlayers,
    nextDeadline: t.phaseDeadline || null, // reloj semanal: cuándo cierra la fase actual
    defendingChampion,
  };
}

app.get("/api/tournaments", async (req, res) => {
  try {
    await ensureActiveTournament();
    const tournaments = await prisma.tournament.findMany({ orderBy: { createdAt: "desc" } });
    const counts = await prisma.tournamentEntry.groupBy({ by: ["tournamentId"], _count: true });
    const countByT = Object.fromEntries(counts.map((c) => [c.tournamentId, c._count]));

    const enriched = await Promise.all(tournaments.map((t) => enrichTournament(t, countByT[t.id] || 0)));

    const [totalPlayers, matchesInPlay, conflictsPending] = await Promise.all([
      prisma.user.count(),
      prisma.tournamentMatch.count({ where: { status: "pendiente" } }),
      prisma.tournamentMatch.count({ where: { status: "conflicto" } }),
    ]);

    res.json({
      tournaments: enriched,
      ecosystem: {
        totalPlayers,
        activeTournaments: tournaments.filter((t) => t.status !== "finalizado").length,
        matchesInPlay,
        conflictsPending,
      },
    });
  } catch (err) {
    console.error("Error en GET /api/tournaments:", err);
    res.status(500).json({ error: "No se pudieron cargar los torneos." });
  }
});

app.get("/api/tournaments/:id", async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: "Torneo no encontrado." });
    const participantCount = await prisma.tournamentEntry.count({ where: { tournamentId: tournament.id } });
    const enriched = await enrichTournament(tournament, participantCount);
    res.json({ tournament: enriched });
  } catch (err) {
    console.error("Error en GET /api/tournaments/:id:", err);
    res.status(500).json({ error: "No se pudo cargar el torneo." });
  }
});

app.post("/api/tournaments/:id/join", authMiddleware, async (req, res) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ error: "Torneo no encontrado." });
    if (tournament.status !== "inscripciones") {
      return res.status(400).json({ error: "Este torneo ya cerró inscripciones." });
    }
    await prisma.tournamentEntry.create({ data: { tournamentId: tournament.id, userId: req.userId } });
    await maybeAdvanceTournament(tournament.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ya estás inscrito en este torneo." });
    }
    console.error("Error en /api/tournaments/:id/join:", err);
    res.status(500).json({ error: "No se pudo completar la inscripción." });
  }
});

app.get("/api/tournaments/:id/participants", async (req, res) => {
  try {
    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId: req.params.id } });
    const matches = await prisma.tournamentMatch.findMany({ where: { tournamentId: req.params.id } });
    const byId = await withPlayers(entries, ["userId"]);
    res.json({
      participants: entries.map((e) => ({
        ...byId[e.userId],
        groupName: e.groupName,
        team: e.team,
        stats: statsForPlayer(e.userId, matches),
      })),
    });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/participants:", err);
    res.status(500).json({ error: "No se pudieron cargar los participantes." });
  }
});

app.get("/api/tournaments/:id/standings", async (req, res) => {
  try {
    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId: req.params.id } });
    const matches = await prisma.tournamentMatch.findMany({ where: { tournamentId: req.params.id, phase: "grupos" } });
    const byId = await withPlayers(entries, ["userId"]);
    const teamById = await withTeams(req.params.id, entries.map((e) => e.userId));
    const byGroup = {};
    entries.forEach((e) => {
      byGroup[e.groupName || "General"] = byGroup[e.groupName || "General"] || [];
      byGroup[e.groupName || "General"].push(e.userId);
    });
    const standings = Object.entries(byGroup).map(([groupName, members]) => ({
      groupName,
      table: computeStandings(members, matches).map((row) => ({
        ...row,
        player: byId[row.userId],
        team: teamById[row.userId],
      })),
    }));
    res.json({ standings });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/standings:", err);
    res.status(500).json({ error: "No se pudo cargar la tabla." });
  }
});

app.get("/api/tournaments/:id/bracket", async (req, res) => {
  try {
    const matches = await prisma.tournamentMatch.findMany({
      where: { tournamentId: req.params.id, phase: "knockout" },
      orderBy: { createdAt: "asc" },
    });
    const byId = await withPlayers(matches, ["playerAId", "playerBId"]);
    const teamById = await withTeams(req.params.id, matches.flatMap((m) => [m.playerAId, m.playerBId]));
    const rounds = {};
    matches
      .filter((m) => m.playerAId !== m.playerBId) // oculta los "bye" técnicos
      .forEach((m) => {
        rounds[m.round] = rounds[m.round] || [];
        rounds[m.round].push({
          ...m,
          playerA: byId[m.playerAId],
          playerB: byId[m.playerBId],
          teamA: teamById[m.playerAId],
          teamB: teamById[m.playerBId],
        });
      });
    res.json({ rounds });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/bracket:", err);
    res.status(500).json({ error: "No se pudo cargar la eliminatoria." });
  }
});

app.get("/api/tournaments/:id/my-matches", authMiddleware, async (req, res) => {
  try {
    const matches = await prisma.tournamentMatch.findMany({
      where: {
        tournamentId: req.params.id,
        status: { not: "aprobado" },
        OR: [{ playerAId: req.userId }, { playerBId: req.userId }],
      },
      orderBy: { createdAt: "asc" },
    });
    const byId = await withPlayers(matches, ["playerAId", "playerBId"]);
    const teamById = await withTeams(req.params.id, matches.flatMap((m) => [m.playerAId, m.playerBId]));
    res.json({
      matches: matches.map((m) => ({
        ...m,
        rival: m.playerAId === req.userId ? byId[m.playerBId] : byId[m.playerAId],
        rivalTeam: m.playerAId === req.userId ? teamById[m.playerBId] : teamById[m.playerAId],
        myTeam: m.playerAId === req.userId ? teamById[m.playerAId] : teamById[m.playerBId],
      })),
    });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/my-matches:", err);
    res.status(500).json({ error: "No se pudieron cargar tus partidos." });
  }
});

// Muro de Resultados: cualquiera puede ver cómo va el torneo, sin sesión.
app.get("/api/tournaments/:id/results", async (req, res) => {
  try {
    const matches = await prisma.tournamentMatch.findMany({
      where: { tournamentId: req.params.id, status: "aprobado" },
      orderBy: { approvedAt: "desc" },
    });
    const real = matches.filter((m) => m.playerAId !== m.playerBId); // sin los "bye" técnicos
    const byId = await withPlayers(real, ["playerAId", "playerBId"]);
    res.json({
      results: real.map((m) => ({
        id: m.id,
        round: m.round,
        playerA: byId[m.playerAId],
        playerB: byId[m.playerBId],
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        approvedAt: m.approvedAt,
      })),
    });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/results:", err);
    res.status(500).json({ error: "No se pudo cargar el muro de resultados." });
  }
});

async function loadMatchForPlayer(matchId, userId) {
  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: 404 };
  if (match.playerAId !== userId && match.playerBId !== userId) return { error: 403 };
  return { match };
}

app.get("/api/tournaments/matches/:matchId", authMiddleware, async (req, res) => {
  const { match, error } = await loadMatchForPlayer(req.params.matchId, req.userId);
  if (error) return res.status(error).json({ error: error === 404 ? "Partido no encontrado." : "No es tu partido." });
  const byId = await withPlayers([match], ["playerAId", "playerBId"]);
  const teamById = await withTeams(match.tournamentId, [match.playerAId, match.playerBId]);
  res.json({
    match: {
      ...match,
      playerA: byId[match.playerAId],
      playerB: byId[match.playerBId],
      teamA: teamById[match.playerAId],
      teamB: teamById[match.playerBId],
    },
  });
});

app.post("/api/tournaments/matches/:matchId/message", authMiddleware, async (req, res) => {
  try {
    const { match, error } = await loadMatchForPlayer(req.params.matchId, req.userId);
    if (error) return res.status(error).json({ error: "No es tu partido." });
    const { text, type } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "Mensaje vacío." });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const validTypes = ["system", "proposal", "confirmation"];
    const messages = [
      ...(match.messages || []),
      {
        id: crypto.randomUUID(),
        type: validTypes.includes(type) ? type : "chat",
        from: user.username,
        text: text.trim().slice(0, 300),
        ts: Date.now(),
      },
    ];
    const activityField = match.playerAId === req.userId ? "lastActiveA" : "lastActiveB";
    const updated = await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: { messages, [activityField]: new Date() },
    });
    res.json({ match: updated });
  } catch (err) {
    console.error("Error en /matches/:matchId/message:", err);
    res.status(500).json({ error: "No se pudo enviar el mensaje." });
  }
});

app.post("/api/tournaments/matches/:matchId/ip", authMiddleware, async (req, res) => {
  try {
    const { match, error } = await loadMatchForPlayer(req.params.matchId, req.userId);
    if (error) return res.status(error).json({ error: "No es tu partido." });
    const { ip } = req.body || {};
    if (!ip || !ip.trim()) return res.status(400).json({ error: "IP vacía." });
    const isA = match.playerAId === req.userId;
    const data = { [isA ? "ipA" : "ipB"]: ip.trim().slice(0, 64), [isA ? "lastActiveA" : "lastActiveB"]: new Date() };
    const updated = await prisma.tournamentMatch.update({ where: { id: match.id }, data });
    res.json({ match: updated });
  } catch (err) {
    console.error("Error en /matches/:matchId/ip:", err);
    res.status(500).json({ error: "No se pudo guardar la IP." });
  }
});

// Cada jugador reporta el marcador que él vio. Si los dos reportes
// coinciden, se aprueba solo y el torneo avanza. Si no coinciden, se marca
// "conflicto" — resolverlo automático es la Fase 4 (Sistema Inteligente).
app.post("/api/tournaments/matches/:matchId/report", authMiddleware, async (req, res) => {
  try {
    const { match, error } = await loadMatchForPlayer(req.params.matchId, req.userId);
    if (error) return res.status(error).json({ error: "No es tu partido." });
    const { scoreA, scoreB } = req.body || {};
    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
      return res.status(400).json({ error: "Marcador inválido." });
    }
    const isA = match.playerAId === req.userId;
    const field = isA ? "reportA" : "reportB";
    const activityField = isA ? "lastActiveA" : "lastActiveB";
    const report = { scoreA, scoreB };
    let updated = await prisma.tournamentMatch.update({
      where: { id: match.id },
      data: { [field]: report, [activityField]: new Date() },
    });

    const bothIn = updated.reportA && updated.reportB;
    if (bothIn) {
      const same = updated.reportA.scoreA === updated.reportB.scoreA && updated.reportA.scoreB === updated.reportB.scoreB;
      if (same) {
        updated = await prisma.tournamentMatch.update({
          where: { id: match.id },
          data: { status: "aprobado", scoreA: updated.reportA.scoreA, scoreB: updated.reportA.scoreB, approvedAt: new Date() },
        });
        await awardMatchPoints(updated);
        const byId = await withPlayers([updated], ["playerAId", "playerBId"]);
        const nameA = byId[updated.playerAId]?.username || "Jugador A";
        const nameB = byId[updated.playerBId]?.username || "Jugador B";
        await addNews(match.tournamentId, `⚽ ${nameA} ${updated.scoreA}-${updated.scoreB} ${nameB}`);
        await maybeAdvanceTournament(match.tournamentId);
      } else {
        const resolved = await tryResolveConflict(updated);
        updated = resolved || (await prisma.tournamentMatch.update({ where: { id: match.id }, data: { status: "conflicto" } }));
      }
    }
    res.json({ match: updated });
  } catch (err) {
    console.error("Error en /matches/:matchId/report:", err);
    res.status(500).json({ error: "No se pudo registrar el resultado." });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

function broadcastQueueCount() {
  cleanQueue();
  io.emit("queue_update", { count: queue.length });
}

io.on("connection", (socket) => {
  socket.on("join_queue", ({ nickname }) => {
    if (!nickname || !nickname.trim()) return;
    const clean = nickname.trim().slice(0, 18);
    removeFromQueue(socket.id);
    cleanQueue();

    const candidate = queue.find((p) => p.socketId !== socket.id);
    if (candidate) {
      removeFromQueue(candidate.socketId);
      const room = createRoom({ socketId: socket.id, nickname: clean }, candidate);
      socket.join(room.id);
      const candidateSocket = io.sockets.sockets.get(candidate.socketId);
      if (candidateSocket) candidateSocket.join(room.id);
      io.to(room.id).emit("matched", { room });
    } else {
      queue.push({ socketId: socket.id, nickname: clean, joinedAt: Date.now() });
      socket.emit("searching");
    }
    broadcastQueueCount();
  });

  socket.on("cancel_search", () => {
    removeFromQueue(socket.id);
    broadcastQueueCount();
  });

  socket.on("browse", () => {
    socket.emit("queue_list", { players: publicQueue(socket.id) });
  });

  socket.on("challenge", ({ rivalSocketId, nickname }) => {
    if (!nickname || !nickname.trim()) return;
    const rival = queue.find((p) => p.socketId === rivalSocketId);
    if (!rival) {
      socket.emit("challenge_failed", { reason: "Ese jugador ya no está disponible." });
      return;
    }
    removeFromQueue(rival.socketId);
    removeFromQueue(socket.id);
    const room = createRoom({ socketId: socket.id, nickname: nickname.trim().slice(0, 18) }, rival);
    socket.join(room.id);
    const rivalSocket = io.sockets.sockets.get(rival.socketId);
    if (rivalSocket) rivalSocket.join(room.id);
    io.to(room.id).emit("matched", { room });
    broadcastQueueCount();
  });

  socket.on("room_message", ({ roomId, text, type }) => {
    const room = rooms.get(roomId);
    if (!room || !text || !text.trim()) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    room.messages.push({
      id: uid(),
      type: type === "system" ? "system" : "chat",
      from: player.nickname,
      text: text.trim().slice(0, 300),
      ts: Date.now(),
    });
    io.to(roomId).emit("room_update", { room });
  });

  socket.on("share_ip", ({ roomId, ip }) => {
    const room = rooms.get(roomId);
    if (!room || !ip || !ip.trim()) return;
    const player = room.players.find((p) => p.socketId === socket.id);
    if (!player) return;
    player.ip = ip.trim().slice(0, 64);
    room.messages.push({
      id: uid(),
      type: "system",
      from: player.nickname,
      text: "Compartió su IP de ZeroTier",
      ts: Date.now(),
    });
    io.to(roomId).emit("room_update", { room });
  });

  socket.on("leave_room", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.status = "closed";
    io.to(roomId).emit("room_update", { room });
    socket.leave(roomId);
    setTimeout(() => rooms.delete(roomId), ROOM_CLEANUP_MS);
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    broadcastQueueCount();
    for (const room of rooms.values()) {
      if (room.status !== "active") continue;
      const wasHere = room.players.some((p) => p.socketId === socket.id);
      if (wasHere) {
        room.messages.push({ id: uid(), type: "system", text: "El rival se desconectó.", ts: Date.now() });
        io.to(room.id).emit("room_update", { room });
      }
    }
  });
});

setInterval(broadcastQueueCount, 30000);

server.listen(PORT, () => {
  console.log(`PES ARENA backend corriendo en el puerto ${PORT}`);
});
