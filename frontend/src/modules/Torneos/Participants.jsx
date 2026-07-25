import { useEffect, useState } from "react";
import { useProfile } from "../../context/ProfileContext";
import PesArenaAvatar from "../../components/PesArenaAvatar";
import TeamBadge from "../../components/TeamBadge";
import { getBackground } from "../Perfil/backgrounds";
import { tournamentsApi } from "./api";

// Convierte un participante del torneo al formato que espera la tarjeta
// de perfil que ya existe (la misma de Cuenta/BuscarRival) — se reutiliza
// tal cual, sin duplicar el diseño del perfil.
function toProfile(p) {
  return {
    nickname: p.username,
    photoUrl: p.photoUrl,
    background: p.background,
    playerId: p.playerId,
    country: p.countryFlag ? { flag: p.countryFlag, name: p.countryName } : null,
    points: p.points,
    confiabilidad: p.confiabilidad,
    memberSince: p.createdAt,
  };
}

export default function Participants({ tournamentId }) {
  const { openProfile } = useProfile();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi
      .participants(tournamentId)
      .then((data) => setParticipants(data.participants))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <p className="text-sm text-chalkDim">Cargando participantes…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  if (participants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm">Todavía no hay nadie inscrito. ¡Sé el primero!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {participants.map((p) => {
        const bg = getBackground(p.background);
        return (
          <button
            key={p.id}
            onClick={() => openProfile({ ...toProfile(p), socketId: p.id })}
            className="rounded-xl p-4 text-center border border-turf"
            style={{ background: `linear-gradient(160deg, ${bg.from}, ${bg.to})` }}
          >
            <div className="flex justify-center mb-2">
              <PesArenaAvatar photoUrl={p.photoUrl} name={p.username} size={56} />
            </div>
            <p className="font-semibold text-sm truncate">{p.username}</p>
            {p.playerId && <p className="text-[10px] font-mono2 text-floodlight">{p.playerId}</p>}
            <div className="flex items-center justify-center gap-1 text-xs text-chalkDim mt-1">
              {p.countryFlag && <span>{p.countryFlag}</span>}
              {p.team && <TeamBadge team={p.team} size={14} />}
              {p.team && <span className="truncate">{p.team}</span>}
            </div>
            {p.groupName && <p className="text-[10px] text-chalkDim mt-1">Grupo {p.groupName}</p>}
            <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-chalkDim">
              <span>{p.points} pts</span>
              <span>·</span>
              <span>{p.confiabilidad}% conf.</span>
            </div>
            {p.stats && (
              <p className="text-[10px] text-chalkDim mt-1">
                {p.stats.pj} PJ · {p.stats.pg}G {p.stats.pe}E {p.stats.pp}P
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
