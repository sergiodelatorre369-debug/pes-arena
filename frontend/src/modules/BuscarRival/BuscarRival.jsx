import { useEffect, useRef, useState } from "react";
import { Zap, Users, ArrowLeft, Swords, LogOut, Copy, Check, Send, UserCircle } from "lucide-react";
import { socket } from "../../socket";
import { useProfile } from "../../context/ProfileContext";
import { useAuth } from "../../context/AuthContext";

function jerseyNum(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 99) + 1;
}

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `hace ${s}s`;
  return `hace ${Math.floor(s / 60)}min`;
}

export default function BuscarRival() {
  const { openProfile } = useProfile();
  const { user } = useAuth();
  const [screen, setScreen] = useState("home");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [onlineCount, setOnlineCount] = useState(0);
  const [queueList, setQueueList] = useState([]);
  const [room, setRoom] = useState(null);

  // Si hay sesión activa, el apodo de la cuenta reemplaza al escrito a mano.
  // Todo lo demás (buscar, retar, chat, IP) sigue usando la misma variable
  // "nickname" de siempre, así que no hace falta tocar esa lógica.
  useEffect(() => {
    if (user) setNickname(user.username);
  }, [user]);
  const [myIp, setMyIp] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [copiedIp, setCopiedIp] = useState(false);
  const messagesEndRef = useRef(null);
  const browseInterval = useRef(null);

  useEffect(() => {
    function onSearching() {
      setScreen("searching");
    }
    function onMatched({ room }) {
      setRoom(room);
      setScreen("room");
    }
    function onQueueUpdate({ count }) {
      setOnlineCount(count);
    }
    function onQueueList({ players }) {
      setQueueList(players);
    }
    function onRoomUpdate({ room }) {
      setRoom(room);
    }
    function onChallengeFailed({ reason }) {
      setError(reason);
    }

    socket.on("searching", onSearching);
    socket.on("matched", onMatched);
    socket.on("queue_update", onQueueUpdate);
    socket.on("queue_list", onQueueList);
    socket.on("room_update", onRoomUpdate);
    socket.on("challenge_failed", onChallengeFailed);

    return () => {
      socket.off("searching", onSearching);
      socket.off("matched", onMatched);
      socket.off("queue_update", onQueueUpdate);
      socket.off("queue_list", onQueueList);
      socket.off("room_update", onRoomUpdate);
      socket.off("challenge_failed", onChallengeFailed);
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [room?.messages?.length]);

  useEffect(() => {
    if (screen === "browse") {
      socket.emit("browse");
      browseInterval.current = setInterval(() => socket.emit("browse"), 2500);
    } else if (browseInterval.current) {
      clearInterval(browseInterval.current);
    }
    return () => browseInterval.current && clearInterval(browseInterval.current);
  }, [screen]);

  const startSearching = () => {
    if (!nickname.trim()) {
      setError("Ponle un apodo primero, compa.");
      return;
    }
    setError("");
    socket.emit("join_queue", { nickname });
  };

  const cancelSearch = () => {
    socket.emit("cancel_search");
    setScreen("home");
  };

  const openBrowse = () => {
    if (!nickname.trim()) {
      setError("Ponle un apodo primero, compa.");
      return;
    }
    setError("");
    setScreen("browse");
  };

  const challengeRival = (rival) => {
    socket.emit("challenge", { rivalSocketId: rival.socketId, nickname });
  };

  const leaveRoom = () => {
    if (room) socket.emit("leave_room", { roomId: room.id });
    setRoom(null);
    setMyIp("");
    setScreen("home");
  };

  const sendSystemMsg = (text) => {
    if (!room) return;
    socket.emit("room_message", { roomId: room.id, text, type: "system" });
  };

  const sendChat = () => {
    if (!chatInput.trim() || !room) return;
    socket.emit("room_message", { roomId: room.id, text: chatInput.trim(), type: "chat" });
    setChatInput("");
  };

  const shareIp = () => {
    if (!myIp.trim() || !room) return;
    socket.emit("share_ip", { roomId: room.id, ip: myIp.trim() });
  };

  const copyOpponentIp = (ip) => {
    if (navigator.clipboard) navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 1500);
  };

  const opponent = room?.players?.find((p) => p.nickname !== nickname);
  const me = room?.players?.find((p) => p.nickname === nickname);

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body">
      {screen === "home" && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-2 text-xs tracking-widest font-semibold text-floodlight">PPSSPP · ONLINE · 1V1</div>
          <h1 className="text-6xl mb-3 font-display tracking-wide">PES ARENA</h1>
          <p className="max-w-sm mb-10 text-chalkDim">
            Encuentra rival, comparte tu IP y entra a la cancha. Sin grupos, sin esperar a nadie.
          </p>

          <div className="w-full max-w-sm mb-6 text-left">
            {user ? (
              <div className="rounded-xl px-4 py-3 border border-turf bg-pitchCard">
                <p className="text-xs tracking-wide text-chalkDim mb-1">JUGANDO COMO</p>
                <p className="font-display text-lg text-floodlight">Bienvenido, {user.username}</p>
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold mb-2 tracking-wide text-chalkDim">TU APODO</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 18))}
                  onKeyDown={(e) => e.key === "Enter" && startSearching()}
                  placeholder="Ej. Chicharito10"
                  aria-label="Tu apodo"
                  className="w-full rounded-xl px-4 py-3 outline-none border border-turf bg-pitchCard text-chalk focus:ring-2 focus:ring-floodlight"
                />
              </>
            )}
            {error && <p className="text-sm mt-2 text-home">{error}</p>}
          </div>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={startSearching}
              className="w-full rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2 bg-home text-white hover:opacity-90"
            >
              <Zap size={20} /> Partida rápida
            </button>
            <button
              onClick={openBrowse}
              className="w-full rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2 border border-turf text-chalk hover:bg-pitchCard"
            >
              <Users size={20} /> Elegir rival
            </button>
          </div>

          <p className="mt-8 text-xs text-chalkDim">
            {onlineCount} jugador{onlineCount === 1 ? "" : "es"} buscando reta ahorita
          </p>
        </div>
      )}

      {screen === "searching" && (
        <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <button
            onClick={cancelSearch}
            className="absolute top-6 left-6 flex items-center gap-1 text-sm text-chalkDim"
          >
            <ArrowLeft size={16} /> Cancelar
          </button>
          <div className="relative flex items-center justify-center mb-8" style={{ width: 140, height: 140 }}>
            <div className="absolute inset-0 rounded-full bg-home opacity-20 animate-ping" />
            <div
              className="absolute inset-4 rounded-full bg-home opacity-25 animate-ping"
              style={{ animationDelay: "0.5s" }}
            />
            <div
              className="relative rounded-full flex items-center justify-center bg-home"
              style={{ width: 72, height: 72 }}
            >
              <Swords size={30} color="#fff" />
            </div>
          </div>
          <h2 className="text-3xl mb-2 font-display">Buscando rival…</h2>
          <p className="text-chalkDim">En cuanto alguien más busque partida, los conectamos.</p>
        </div>
      )}

      {screen === "browse" && (
        <div className="min-h-screen px-5 py-8 max-w-md mx-auto">
          <button onClick={() => setScreen("home")} className="flex items-center gap-1 text-sm mb-6 text-chalkDim">
            <ArrowLeft size={16} /> Volver
          </button>
          <h2 className="text-3xl mb-1 font-display">Elegir rival</h2>
          <p className="text-sm mb-6 text-chalkDim">Jugadores esperando partida ahorita.</p>

          {queueList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-turf p-8 text-center">
              <p className="mb-4 text-chalkDim">Todavía no hay nadie esperando.</p>
              <button onClick={startSearching} className="rounded-xl px-5 py-2.5 font-bold bg-home text-white">
                Buscar partida rápida
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {queueList.map((p) => (
                <div
                  key={p.socketId}
                  className="flex items-center gap-3 rounded-xl p-4 border border-turf bg-pitchCard w-full hover:border-home"
                >
                  <div className="flex items-center justify-center rounded-lg text-lg font-bold w-11 h-11 bg-awayDim font-display">
                    {jerseyNum(p.socketId)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{p.nickname}</div>
                    <div className="text-xs text-chalkDim">{timeAgo(p.joinedAt)}</div>
                  </div>
                  <button
                    onClick={() => openProfile(p)}
                    aria-label={`Ver perfil de ${p.nickname}`}
                    className="text-chalkDim hover:text-floodlight"
                  >
                    <UserCircle size={20} />
                  </button>
                  <button
                    onClick={() => challengeRival(p)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-home text-white"
                  >
                    Retar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === "room" && room && (
        <div className="min-h-screen flex flex-col max-w-md mx-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-turf">
            <button onClick={leaveRoom} className="flex items-center gap-1 text-sm text-chalkDim">
              <LogOut size={16} /> Salir
            </button>
            <span className="text-xs font-semibold tracking-wide text-floodlight">SALA DE CONEXIÓN</span>
          </div>

          {room.status === "closed" && (
            <div className="px-5 py-2 text-sm text-center bg-homeDim">Esta sala se cerró.</div>
          )}

          <div className="flex items-center justify-between px-5 py-5 bg-pitchCard">
            <div className="text-left">
              <div className="text-xs mb-1 text-chalkDim">TÚ</div>
              <div className="text-xl text-home font-display">{me?.nickname}</div>
            </div>
            <div className="text-2xl text-chalkDim font-display">VS</div>
            <div className="text-right">
              <div className="text-xs mb-1 text-chalkDim">RIVAL</div>
              <div className="text-xl text-away font-display">{opponent?.nickname}</div>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-turf">
            <div className="text-xs font-semibold mb-2 tracking-wide text-chalkDim">CONEXIÓN ZEROTIER</div>
            <div className="flex gap-2 mb-3">
              <input
                value={myIp}
                onChange={(e) => setMyIp(e.target.value)}
                placeholder="Tu IP (ej. 10.1.2.3)"
                aria-label="Tu IP de ZeroTier"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border border-turf bg-pitch font-mono2"
              />
              <button onClick={shareIp} className="rounded-lg px-4 text-sm font-bold bg-home text-white">
                Compartir
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-pitch">
              <span className={`text-sm font-mono2 ${opponent?.ip ? "text-chalk" : "text-chalkDim"}`}>
                {opponent?.ip || "Esperando la IP del rival…"}
              </span>
              {opponent?.ip && (
                <button
                  onClick={() => copyOpponentIp(opponent.ip)}
                  aria-label="Copiar IP del rival"
                  className="text-floodlight"
                >
                  {copiedIp ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-turf">
            {["Ya creé sala", "No conecta", "Vuelve a crear", "Listo, a jugar"].map((txt) => (
              <button
                key={txt}
                onClick={() => sendSystemMsg(txt)}
                className="text-xs rounded-full px-3 py-1.5 border border-turf text-chalkDim hover:border-floodlight"
              >
                {txt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2" style={{ minHeight: 180 }}>
            {room.messages.map((m) => {
              const mine = m.from === nickname;
              const pureSystem = m.type === "system" && !m.from;
              const bubbleClass = pureSystem
                ? "self-center text-center italic bg-transparent px-2 py-1"
                : mine
                ? "self-end bg-homeDim px-3 py-2"
                : "self-start bg-awayDim px-3 py-2";
              return (
                <div key={m.id} className={`rounded-xl text-sm ${bubbleClass}`} style={{ maxWidth: "80%" }}>
                  {m.from && !pureSystem && <div className="text-[10px] opacity-70 mb-0.5">{m.from}</div>}
                  {m.text}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 px-5 py-4 border-t border-turf">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Escribe un mensaje…"
              aria-label="Mensaje"
              className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border border-turf bg-pitchCard"
            />
            <button
              onClick={sendChat}
              aria-label="Enviar mensaje"
              className="rounded-lg px-3 bg-home text-white"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
