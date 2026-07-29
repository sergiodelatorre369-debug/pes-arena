import { useEffect, useState } from "react";
import { Trophy, Users, Globe2, Clock, Crown } from "lucide-react";
import { tournamentsApi } from "./api";
import { getTheme } from "./themes";
import EcosystemPanel from "./EcosystemPanel";
import TournamentDetail from "./TournamentDetail";

const STATUS_LABEL = {
  inscripciones: "Inscripciones abiertas",
  grupos: "Fase de grupos",
  eliminatorias: "Eliminatorias",
  finalizado: "Finalizado",
};

function countdownLabel(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "en revisión…";
  const hours = ms / 3600000;
  if (hours < 24) return `${Math.ceil(hours)}h`;
  return `${Math.ceil(hours / 24)} días`;
}

export default function Torneos() {
  const [tournaments, setTournaments] = useState([]);
  const [ecosystem, setEcosystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (selectedId) return;
    const load = () =>
      tournamentsApi
        .list()
        .then((data) => {
          setTournaments(data.tournaments);
          setEcosystem(data.ecosystem);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [selectedId]);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  // La cuenta regresiva más próxima entre TODOS los torneos activos —
  // dato real (viene de los plazos que ya existen), no un número inventado.
  const nextDeadlines = tournaments.map((t) => t.nextDeadline).filter(Boolean).sort();
  const globalNextDeadline = nextDeadlines[0];

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <div className="mb-6">
        <p className="text-xs tracking-widest uppercase text-floodlight mb-1">🏟️ Temporada PES ARENA</p>
        <h2 className="text-3xl mb-1 font-display">Lobby de Competencias</h2>
        <p className="text-xs text-chalkDim">
          Todos los torneos avanzan de fase automático — nadie tiene que empujar nada.
          {globalNextDeadline && (
            <>
              {" "}Próximo cambio: <span className="text-floodlight">{countdownLabel(globalNextDeadline)}</span>.
            </>
          )}
        </p>
      </div>

      <EcosystemPanel ecosystem={ecosystem} />

      {loading && <p className="text-sm text-chalkDim">Cargando torneos…</p>}
      {error && <p className="text-sm text-home">{error}</p>}

      <div className="flex flex-col gap-3">
        {tournaments.map((t) => {
          const isLiga = t.type === "liga";
          const Icon = isLiga ? Globe2 : Trophy;
          const theme = getTheme(t.theme);
          return (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="rounded-xl bg-pitchCard p-5 text-left overflow-hidden relative"
              style={{ borderLeft: `6px solid ${theme.accent}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={18} style={{ color: theme.accent }} />
                <h3 className="font-display text-xl">{t.name}</h3>
                <span
                  className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ml-auto text-pitch"
                  style={{ background: theme.accent }}
                >
                  {isLiga ? "Liga" : "Copa"} · Ed. {t.edition}
                </span>
              </div>
              <p className="text-xs text-chalkDim mb-2">{STATUS_LABEL[t.status] || t.status}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalkDim">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {t.participantCount}/{t.cupo}
                </span>
                {t.nextDeadline && t.status !== "finalizado" && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {countdownLabel(t.nextDeadline)}
                  </span>
                )}
                {t.defendingChampion && (
                  <span className="flex items-center gap-1">
                    <Crown size={12} /> {t.defendingChampion}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
