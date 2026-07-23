import { useEffect, useState } from "react";
import { tournamentsApi } from "./api";

export default function Participants({ tournamentId }) {
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
    <div className="flex flex-col gap-2">
      {participants.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-turf bg-pitchCard px-4 py-3">
          <div className="flex items-center gap-2">
            {p.countryFlag && <span>{p.countryFlag}</span>}
            <span className="font-semibold text-sm">{p.username}</span>
          </div>
          {p.groupName && (
            <span className="text-xs font-mono2 text-floodlight">Grupo {p.groupName}</span>
          )}
        </div>
      ))}
    </div>
  );
}
