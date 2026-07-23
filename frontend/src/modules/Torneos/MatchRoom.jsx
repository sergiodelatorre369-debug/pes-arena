import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, Check, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { tournamentsApi } from "./api";

const POLL_MS = 3000;

export default function MatchRoom({ matchId, onBack }) {
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [myIp, setMyIp] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const load = async () => {
    try {
      const { match } = await tournamentsApi.matchDetail(matchId);
      setMatch(match);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [match?.messages?.length]);

  if (!match) {
    return (
      <div className="min-h-screen bg-pitch text-chalk font-body flex items-center justify-center">
        <p className="text-chalkDim text-sm">Cargando sala…</p>
      </div>
    );
  }

  const isA = match.playerAId === user?.id;
  const me = isA ? match.playerA : match.playerB;
  const rival = isA ? match.playerB : match.playerA;
  const rivalIp = isA ? match.ipB : match.ipA;
  const myReport = isA ? match.reportA : match.reportB;

  const sendSystemMsg = async (text) => {
    try {
      const { match: updated } = await tournamentsApi.sendMessage(matchId, text, "system");
      setMatch(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    try {
      const { match: updated } = await tournamentsApi.sendMessage(matchId, chatInput.trim(), "chat");
      setChatInput("");
      setMatch(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const shareIp = async () => {
    if (!myIp.trim()) return;
    try {
      const { match: updated } = await tournamentsApi.shareIp(matchId, myIp.trim());
      setMatch(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  const copyRivalIp = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(rivalIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submitReport = async () => {
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (Number.isNaN(a) || Number.isNaN(b)) {
      setError("Pon el marcador completo (ej. 3 - 1).");
      return;
    }
    try {
      const { match: updated } = await tournamentsApi.reportResult(matchId, isA ? a : b, isA ? b : a);
      setMatch(updated);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-pitch text-chalk font-body">
      <div className="flex items-center justify-between px-5 py-4 border-b border-turf">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-chalkDim">
          <ArrowLeft size={16} /> Volver
        </button>
        <span className="text-xs font-semibold tracking-wide text-floodlight">{match.round}</span>
      </div>

      {match.status === "aprobado" && (
        <div className="px-5 py-2 text-sm text-center bg-pitchCard">
          ✅ Resultado aprobado: {match.scoreA} - {match.scoreB}
        </div>
      )}
      {match.status === "conflicto" && (
        <div className="px-5 py-2 text-sm text-center bg-homeDim">
          ⚠️ Los marcadores no coinciden. Esto se resolverá pronto — sigue jugando tus otros partidos mientras tanto.
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-5 bg-pitchCard">
        <div className="text-left">
          <div className="text-xs mb-1 text-chalkDim">TÚ</div>
          <div className="text-xl text-home font-display">{me?.username}</div>
        </div>
        <div className="text-2xl text-chalkDim font-display">VS</div>
        <div className="text-right">
          <div className="text-xs mb-1 text-chalkDim">RIVAL</div>
          <div className="text-xl text-away font-display">{rival?.username}</div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-turf">
        <div className="text-xs font-semibold mb-2 tracking-wide text-chalkDim">CONEXIÓN ZEROTIER</div>
        <div className="flex gap-2 mb-3">
          <input
            value={myIp}
            onChange={(e) => setMyIp(e.target.value)}
            placeholder="Tu IP (ej. 10.1.2.3)"
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border border-turf bg-pitch font-mono2"
          />
          <button onClick={shareIp} className="rounded-lg px-4 text-sm font-bold bg-home text-white">
            Compartir
          </button>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-pitch">
          <span className={`text-sm font-mono2 ${rivalIp ? "text-chalk" : "text-chalkDim"}`}>
            {rivalIp || "Esperando la IP del rival…"}
          </span>
          {rivalIp && (
            <button onClick={copyRivalIp} aria-label="Copiar IP del rival" className="text-floodlight">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-turf">
        {["Ya creé sala", "No conecta", "Vuelve a crear", "Listo, a jugar"].map((txt) => (
          <button
            key={txt}
            onClick={() => sendSystemMsg(txt)}
            className="text-xs rounded-full px-3 py-1.5 border border-turf text-chalkDim"
          >
            {txt}
          </button>
        ))}
      </div>

      {match.status !== "aprobado" && (
        <div className="px-5 py-4 border-b border-turf">
          <div className="text-xs font-semibold mb-2 tracking-wide text-chalkDim">SUBIR RESULTADO</div>
          {myReport ? (
            <p className="text-sm text-chalkDim">
              Ya mandaste tu marcador ({isA ? myReport.scoreA : myReport.scoreB} -{" "}
              {isA ? myReport.scoreB : myReport.scoreA}). Esperando que tu rival mande el suyo.
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={scoreA}
                onChange={(e) => setScoreA(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="Tú"
                inputMode="numeric"
                className="w-16 rounded-lg px-3 py-2 text-center text-sm outline-none border border-turf bg-pitch"
              />
              <span className="text-chalkDim">-</span>
              <input
                value={scoreB}
                onChange={(e) => setScoreB(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="Rival"
                inputMode="numeric"
                className="w-16 rounded-lg px-3 py-2 text-center text-sm outline-none border border-turf bg-pitch"
              />
              <button onClick={submitReport} className="flex-1 rounded-lg py-2 text-sm font-bold bg-home text-white">
                Enviar
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="px-5 pt-2 text-sm text-home">{error}</p>}

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2" style={{ minHeight: 140 }}>
        {(match.messages || []).map((m) => {
          const mine = m.from === user?.username;
          const pureSystem = m.type === "system" && !m.from;
          return (
            <div
              key={m.id}
              className={`rounded-xl text-sm ${
                pureSystem
                  ? "self-center text-center italic bg-transparent px-2 py-1"
                  : mine
                  ? "self-end bg-homeDim px-3 py-2"
                  : "self-start bg-awayDim px-3 py-2"
              }`}
              style={{ maxWidth: "80%" }}
            >
              {m.from && <div className="text-[10px] opacity-70 mb-0.5">{m.from}</div>}
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
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border border-turf bg-pitchCard"
        />
        <button onClick={sendChat} aria-label="Enviar mensaje" className="rounded-lg px-3 bg-home text-white">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
