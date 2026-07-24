import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";
import { prisma } from "./db.js";
import { hashPassword, comparePassword, signToken, authMiddleware, publicUser } from "./auth.js";
import { assignGroups, roundRobinPairs, computeStandings, seedKnockout, roundName } from "./tournaments.js";

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

async function ensureActiveTournament() {
  const active = await prisma.tournament.findFirst({
    where: { status: { not: "finalizado" } },
    orderBy: { createdAt: "desc" },
  });
  if (active) return active;
  return prisma.tournament.create({ data: { name: "Copa PES ARENA", type: "copa", minPlayers: 4 } });
}

async function maybeAdvanceTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return;

  if (tournament.status === "inscripciones") {
    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId } });
    if (entries.length < tournament.minPlayers) return;

    const assignment = assignGroups(entries.map((e) => e.userId), tournament.maxGroupSize);
    await Promise.all(
      entries.map((e) =>
        prisma.tournamentEntry.update({ where: { id: e.id }, data: { groupName: assignment[e.userId] } })
      )
    );
    const groups = {};
    Object.entries(assignment).forEach(([userId, g]) => {
      groups[g] = groups[g] || [];
      groups[g].push(userId);
    });
    const matchData = [];
    Object.entries(groups).forEach(([groupName, members]) => {
      roundRobinPairs(members).forEach(([a, b]) => {
        matchData.push({ tournamentId, phase: "grupos", round: `Grupo ${groupName}`, playerAId: a, playerBId: b });
      });
    });
    await prisma.tournamentMatch.createMany({ data: matchData });
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "grupos" } });
    return;
  }

  if (tournament.status === "grupos") {
    const groupMatches = await prisma.tournamentMatch.findMany({ where: { tournamentId, phase: "grupos" } });
    if (groupMatches.length === 0 || groupMatches.some((m) => m.status !== "aprobado")) return;

    const entries = await prisma.tournamentEntry.findMany({ where: { tournamentId } });
    const byGroup = {};
    entries.forEach((e) => {
      byGroup[e.groupName] = byGroup[e.groupName] || [];
      byGroup[e.groupName].push(e.userId);
    });
    const qualified = [];
    Object.values(byGroup).forEach((members) => {
      const matches = groupMatches.filter((m) => members.includes(m.playerAId));
      const table = computeStandings(members, matches);
      qualified.push(...table.slice(0, tournament.advancePerGroup).map((row) => row.userId));
    });

    if (qualified.length <= 1) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "finalizado", championId: qualified[0] || null },
      });
      return;
    }

    const { pairs, byes } = seedKnockout(qualified);
    const round = roundName(qualified.length);
    const matchData = pairs.map(([a, b]) => ({ tournamentId, phase: "knockout", round, playerAId: a, playerBId: b }));
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
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "eliminatorias" } });
    return;
  }

  if (tournament.status === "eliminatorias") {
    const allKnockout = await prisma.tournamentMatch.findMany({
      where: { tournamentId, phase: "knockout" },
      orderBy: { createdAt: "desc" },
    });
    if (allKnockout.length === 0) return;
    const latestRound = allKnockout[0].round;
    const currentRoundMatches = allKnockout.filter((m) => m.round === latestRound);
    if (currentRoundMatches.some((m) => m.status !== "aprobado")) return;

    const winners = currentRoundMatches.map((m) => (m.scoreA >= m.scoreB ? m.playerAId : m.playerBId));

    if (winners.length <= 1) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { status: "finalizado", championId: winners[0] || null },
      });
      return;
    }

    const { pairs, byes } = seedKnockout(winners);
    const round = roundName(winners.length);
    const matchData = pairs.map(([a, b]) => ({ tournamentId, phase: "knockout", round, playerAId: a, playerBId: b }));
    await prisma.tournamentMatch.createMany({ data: matchData });
    await Promise.all(
      byes.map((userId) =>
        prisma.tournamentMatch.create({
          data: { tournamentId, phase: "knockout", round, playerAId: userId, playerBId: userId, status: "aprobado", scoreA: 1, scoreB: 0 },
        })
      )
    );
  }
}

app.get("/api/tournaments", async (req, res) => {
  try {
    await ensureActiveTournament();
    const tournaments = await prisma.tournament.findMany({ orderBy: { createdAt: "desc" } });
    const counts = await prisma.tournamentEntry.groupBy({ by: ["tournamentId"], _count: true });
    const countByT = Object.fromEntries(counts.map((c) => [c.tournamentId, c._count]));
    res.json({
      tournaments: tournaments.map((t) => ({ ...t, participantCount: countByT[t.id] || 0 })),
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
    res.json({ tournament: { ...tournament, participantCount } });
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
    const byId = await withPlayers(entries, ["userId"]);
    res.json({ participants: entries.map((e) => ({ ...byId[e.userId], groupName: e.groupName })) });
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
    const byGroup = {};
    entries.forEach((e) => {
      byGroup[e.groupName || "General"] = byGroup[e.groupName || "General"] || [];
      byGroup[e.groupName || "General"].push(e.userId);
    });
    const standings = Object.entries(byGroup).map(([groupName, members]) => ({
      groupName,
      table: computeStandings(members, matches).map((row) => ({ ...row, player: byId[row.userId] })),
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
    const rounds = {};
    matches
      .filter((m) => m.playerAId !== m.playerBId) // oculta los "bye" técnicos
      .forEach((m) => {
        rounds[m.round] = rounds[m.round] || [];
        rounds[m.round].push({ ...m, playerA: byId[m.playerAId], playerB: byId[m.playerBId] });
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
    res.json({
      matches: matches.map((m) => ({
        ...m,
        rival: m.playerAId === req.userId ? byId[m.playerBId] : byId[m.playerAId],
      })),
    });
  } catch (err) {
    console.error("Error en /api/tournaments/:id/my-matches:", err);
    res.status(500).json({ error: "No se pudieron cargar tus partidos." });
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
  res.json({ match: { ...match, playerA: byId[match.playerAId], playerB: byId[match.playerBId] } });
});

app.post("/api/tournaments/matches/:matchId/message", authMiddleware, async (req, res) => {
  try {
    const { match, error } = await loadMatchForPlayer(req.params.matchId, req.userId);
    if (error) return res.status(error).json({ error: "No es tu partido." });
    const { text, type } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "Mensaje vacío." });
    const author = match.playerAId === req.userId ? match.playerA : match.playerB;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const messages = [
      ...(match.messages || []),
      { id: crypto.randomUUID(), type: type === "system" ? "system" : "chat", from: user.username, text: text.trim().slice(0, 300), ts: Date.now() },
    ];
    const updated = await prisma.tournamentMatch.update({ where: { id: match.id }, data: { messages } });
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
    const field = match.playerAId === req.userId ? "ipA" : "ipB";
    const updated = await prisma.tournamentMatch.update({ where: { id: match.id }, data: { [field]: ip.trim().slice(0, 64) } });
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
    const field = match.playerAId === req.userId ? "reportA" : "reportB";
    const report = { scoreA, scoreB };
    let updated = await prisma.tournamentMatch.update({ where: { id: match.id }, data: { [field]: report } });

    const bothIn = updated.reportA && updated.reportB;
    if (bothIn) {
      const same = updated.reportA.scoreA === updated.reportB.scoreA && updated.reportA.scoreB === updated.reportB.scoreB;
      if (same) {
        updated = await prisma.tournamentMatch.update({
          where: { id: match.id },
          data: { status: "aprobado", scoreA: updated.reportA.scoreA, scoreB: updated.reportA.scoreB },
        });
        await maybeAdvanceTournament(match.tournamentId);
      } else {
        updated = await prisma.tournamentMatch.update({ where: { id: match.id }, data: { status: "conflicto" } });
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
