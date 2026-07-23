import { useEffect, useState } from "react";
import { tournamentsApi } from "./api";

export default function Bracket({ tournamentId }) {
  const [rounds, setRounds] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi
      .bracket(tournamentId)
      .then((data) => setRounds(data.rounds))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <p className="text-sm text-chalkDim">Cargando eliminatorias…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  const roundNames = Object.keys(rounds);
  if (roundNames.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm">Las eliminatorias empiezan cuando termine la fase de grupos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {roundNames.map((round) => (
        <div key={round}>
          <h3 className="font-display text-lg mb-2 text-floodlight">{round}</h3>
          <div className="flex flex-col gap-2">
            {rounds[round].map((m) => (
              <div key={m.id} className="rounded-xl border border-turf bg-pitchCard p-3 flex items-center justify-between text-sm">
                <span className={m.status === "aprobado" && m.scoreA > m.scoreB ? "text-floodlight font-bold" : ""}>
                  {m.playerA?.username || "?"}
                </span>
                <span className="text-chalkDim font-mono2">
                  {m.status === "aprobado" ? `${m.scoreA} - ${m.scoreB}` : "vs"}
                </span>
                <span className={m.status === "aprobado" && m.scoreB > m.scoreA ? "text-floodlight font-bold" : ""}>
                  {m.playerB?.username || "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
