import { useEffect, useState } from "react";
import { ChevronRight, Clock } from "lucide-react";
import TeamBadge from "../../components/TeamBadge";
import { tournamentsApi } from "./api";

function deadlineLabel(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { text: "Plazo vencido, en revisión", urgent: true };
  const hours = ms / 3600000;
  if (hours < 24) return { text: `Vence en ${Math.ceil(hours)}h`, urgent: true };
  return { text: `Vence en ${Math.ceil(hours / 24)} días`, urgent: false };
}

export default function MyMatches({ tournamentId, onOpenMatch }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi
      .myMatches(tournamentId)
      .then((data) => setMatches(data.matches))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <p className="text-sm text-chalkDim">Cargando tus partidos…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm">No tienes partidos pendientes ahorita.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => {
        const dl = deadlineLabel(m.deadline);
        return (
          <button
            key={m.id}
            onClick={() => onOpenMatch(m.id)}
            className="flex items-center gap-3 rounded-xl p-4 border border-turf bg-pitchCard text-left"
          >
            <div className="flex-1">
              <div className="text-xs text-chalkDim mb-1">{m.round}</div>
              <div className="font-semibold">vs {m.rival?.username || "Rival"}</div>
              {m.rivalTeam && (
                <div className="flex items-center gap-1 text-xs text-floodlight mt-1">
                  <TeamBadge team={m.rivalTeam} size={16} />
                  {m.rivalTeam}
                </div>
              )}
              {m.status === "conflicto" && <div className="text-xs text-home mt-1">Marcadores en conflicto</div>}
              {dl && (
                <div className={`flex items-center gap-1 text-xs mt-1 ${dl.urgent ? "text-home" : "text-chalkDim"}`}>
                  <Clock size={12} /> {dl.text}
                </div>
              )}
            </div>
            <ChevronRight size={18} className="text-chalkDim" />
          </button>
        );
      })}
    </div>
  );
}
