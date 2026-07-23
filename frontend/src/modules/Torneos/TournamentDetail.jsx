import { useEffect, useState } from "react";
import { ArrowLeft, Trophy, Grid3x3, Swords, Users, ScrollText, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { tournamentsApi } from "./api";
import MyMatches from "./MyMatches";
import Standings from "./Standings";
import Bracket from "./Bracket";
import Participants from "./Participants";
import Reglamento from "./Reglamento";
import MatchRoom from "./MatchRoom";

const STATUS_LABEL = {
  inscripciones: "Inscripciones abiertas",
  grupos: "Fase de grupos",
  eliminatorias: "Eliminatorias",
  finalizado: "Torneo finalizado",
};

const MENU = [
  { id: "mis-partidos", label: "Mis Partidos", icon: Swords },
  { id: "tabla", label: "Tabla", icon: Grid3x3 },
  { id: "eliminatorias", label: "Eliminatorias", icon: Trophy },
  { id: "participantes", label: "Participantes", icon: Users },
  { id: "reglamento", label: "Reglamento", icon: ScrollText },
];

export default function TournamentDetail({ tournamentId, onBack }) {
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [view, setView] = useState("menu");
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");

  const loadTournament = () => {
    tournamentsApi.detail(tournamentId).then((data) => setTournament(data.tournament));
  };

  useEffect(() => {
    loadTournament();
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  if (activeMatchId) {
    return <MatchRoom matchId={activeMatchId} onBack={() => setActiveMatchId(null)} />;
  }

  const handleJoin = async () => {
    setJoining(true);
    setJoinMsg("");
    try {
      await tournamentsApi.join(tournamentId);
      setJoinMsg("¡Ya estás inscrito!");
      loadTournament();
    } catch (err) {
      setJoinMsg(err.message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <button
        onClick={() => (view === "menu" ? onBack() : setView("menu"))}
        className="flex items-center gap-1 text-sm mb-6 text-chalkDim"
      >
        <ArrowLeft size={16} /> {view === "menu" ? "Volver" : "Menú del torneo"}
      </button>

      {tournament && (
        <div className="rounded-xl border border-floodlight/30 bg-pitchCard p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-floodlight" />
            <h2 className="font-display text-2xl">{tournament.name}</h2>
          </div>
          <p className="text-xs text-chalkDim mb-3">{STATUS_LABEL[tournament.status]}</p>
          <p className="text-sm text-chalkDim mb-4">{tournament.participantCount} jugador(es) inscritos</p>

          {tournament.status === "inscripciones" &&
            (user ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full rounded-xl py-3 font-bold bg-home text-white disabled:opacity-60"
              >
                {joining ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Inscribirme"}
              </button>
            ) : (
              <p className="text-xs text-chalkDim">Inicia sesión en Cuenta para poder inscribirte.</p>
            ))}
          {joinMsg && <p className="text-xs mt-2 text-floodlight">{joinMsg}</p>}
        </div>
      )}

      {view === "menu" && (
        <div className="grid grid-cols-2 gap-3">
          {MENU.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="flex flex-col items-center gap-2 rounded-xl border border-turf bg-pitchCard py-6 hover:border-home"
            >
              <Icon size={22} className="text-floodlight" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      )}

      {view === "mis-partidos" && <MyMatches tournamentId={tournamentId} onOpenMatch={setActiveMatchId} />}
      {view === "tabla" && <Standings tournamentId={tournamentId} />}
      {view === "eliminatorias" && <Bracket tournamentId={tournamentId} />}
      {view === "participantes" && <Participants tournamentId={tournamentId} />}
      {view === "reglamento" && <Reglamento />}
    </div>
  );
}
