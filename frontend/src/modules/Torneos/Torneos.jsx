import { useEffect, useState } from "react";
import { Trophy, Users } from "lucide-react";
import { tournamentsApi } from "./api";
import TournamentDetail from "./TournamentDetail";

const STATUS_LABEL = {
  inscripciones: "Inscripciones abiertas",
  grupos: "Fase de grupos",
  eliminatorias: "Eliminatorias",
  finalizado: "Finalizado",
};

export default function Torneos() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (selectedId) return;
    tournamentsApi
      .list()
      .then((data) => setTournaments(data.tournaments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <h2 className="text-3xl mb-1 font-display">Torneos</h2>
      <p className="text-sm mb-6 text-chalkDim">Siempre hay una competencia en marcha.</p>

      {loading && <p className="text-sm text-chalkDim">Cargando torneos…</p>}
      {error && <p className="text-sm text-home">{error}</p>}

      <div className="flex flex-col gap-3">
        {tournaments.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedId(t.id)}
            className="rounded-xl border border-turf bg-pitchCard p-5 text-left hover:border-home"
          >
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={18} className="text-floodlight" />
              <h3 className="font-display text-xl">{t.name}</h3>
            </div>
            <p className="text-xs text-chalkDim mb-2">{STATUS_LABEL[t.status] || t.status}</p>
            <div className="flex items-center gap-1 text-xs text-chalkDim">
              <Users size={14} />
              {t.participantCount} inscritos
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
