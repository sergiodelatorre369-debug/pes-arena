import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { tournamentsApi } from "./api";

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
      {matches.map((m) => (
        <button
          key={m.id}
          onClick={() => onOpenMatch(m.id)}
          className="flex items-center gap-3 rounded-xl p-4 border border-turf bg-pitchCard text-left"
        >
          <div className="flex-1">
            <div className="text-xs text-chalkDim mb-1">{m.round}</div>
            <div className="font-semibold">vs {m.rival?.username || "Rival"}</div>
            {m.status === "conflicto" && <div className="text-xs text-home mt-1">Marcadores en conflicto</div>}
          </div>
          <ChevronRight size={18} className="text-chalkDim" />
        </button>
      ))}
    </div>
  );
}
