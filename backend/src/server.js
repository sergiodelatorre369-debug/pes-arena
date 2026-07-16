import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import crypto from "crypto";

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
// HTTP app (solo para health check / monitoreo, la app real habla por sockets)
// ---------------------------------------------------------------------------
const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.get("/health", (req, res) => {
  cleanQueue();
  res.json({ ok: true, enCola: queue.length, salasActivas: rooms.size });
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
