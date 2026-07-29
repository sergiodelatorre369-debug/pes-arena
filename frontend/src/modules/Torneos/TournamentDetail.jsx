import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Trophy,
  Grid3x3,
  Swords,
  Users,
  ScrollText,
  Loader2,
  ListChecks,
  Newspaper as NewspaperIcon,
  Shirt,
  Clock,
  Crown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { tournamentsApi } from "./api";
import { getTheme } from "./themes";
import MyMatches from "./MyMatches";
import Standings from "./Standings";
import Bracket from "./Bracket";
import Participants from "./Participants";
import Reglamento from "./Reglamento";
import Resultados from "./Resultados";
import Noticias from "./Noticias";
import TeamsBank from "./TeamsBank";
import MatchRoom from "./MatchRoom";
import SorteoOficial from "./SorteoOficial";

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
  { id: "resultados", label: "Resultados", icon: ListChecks },
  { id: "participantes", label: "Participantes", icon: Users },
  { id: "equipos", label: "Banco de Equipos", icon: Shirt },
  { id: "noticias", label: "Noticias", icon: NewspaperIcon },
  { id: "reglamento", label: "Reglamento", icon: ScrollText },
];

function countdownLabel(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "en revisión…";
  const hours = ms / 3600000;
  if (hours < 24) return `${Math.ceil(hours)}h`;
  return `${Math.ceil(hours / 24)} días`;
}

export default function TournamentDetail({ tournamentId, onBack }) {
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [view, setView] = useState("menu");
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [myEntry, setMyEntry] = useState(null);
  const [entryLoaded, setEntryLoaded] = useState(false);

  const loadTournament = () => {
    tournamentsApi.detail(tournamentId).then((data) => setTournament(data.tournament));
  };

  const loadMyEntry = () => {
    if (!user) {
      setEntryLoaded(true);
      return;
    }
    tournamentsApi
      .myEntry(tournamentId)
      .then((data) => setMyEntry(data.entry))
      .catch(() => {})
      .finally(() => setEntryLoaded(true));
  };

  useEffect(() => {
    loadTournament();
    loadMyEntry();
    const interval = setInterval(loadTournament, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (activeMatchId) {
    return <MatchRoom matchId={activeMatchId} tournamentType={tournament?.type} onBack={() => setActiveMatchId(null)} />;
  }

  // Sorteo Oficial PES ARENA: ya tiene equipo asignado, pero todavía no vio
  // la ruleta que lo revela — se le muestra antes que cualquier otra cosa.
  if (entryLoaded && myEntry?.team && !myEntry.sorteoSeen) {
    return (
      <SorteoOficial
        tournament={tournament}
        team={myEntry.team}
        onDone={async () => {
          try {
            await tournamentsApi.markSorteoSeen(tournamentId);
          } catch {
            // si falla, no lo bloqueamos — mejor dejarlo pasar que atorarlo aquí
          }
          setMyEntry({ ...myEntry, sorteoSeen: true });
        }}
      />
    );
  }

  const handleJoin = async () => {
    setJoining(true);
    setJoinMsg("");
    try {
      await tournamentsApi.join(tournamentId);
      setJoinMsg("¡Ya estás inscrito!");
      loadTournament();
      loadMyEntry();
    } catch (err) {
      setJoinMsg(err.message);
    } finally {
      setJoining(false);
    }
  };

  const theme = getTheme(tournament?.theme);

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <button
        onClick={() => (view === "menu" ? onBack() : setView("menu"))}
        className="flex items-center gap-1 text-sm mb-6 text-chalkDim"
      >
        <ArrowLeft size={16} /> {view === "menu" ? "Volver" : "Menú del torneo"}
      </button>

      {tournament && (
        <div
          className="rounded-xl p-5 mb-6 border"
          style={{ borderColor: `${theme.accent}55`, background: `linear-gradient(160deg, ${theme.accentDim}, #0F1C13)` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} style={{ color: theme.accent }} />
            <h2 className="font-display text-2xl">{tournament.name}</h2>
            <span
              className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 ml-auto border"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              Edición {tournament.edition}
            </span>
          </div>
          <p className="text-xs text-chalkDim mb-3">{STATUS_LABEL[tournament.status]}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-chalkDim mb-4">
            <span className="flex items-center gap-1">
              <Users size={12} /> {tournament.participantCount}/{tournament.cupo}
            </span>
            {tournament.nextDeadline && tournament.status !== "finalizado" && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> próximo vence en {countdownLabel(tournament.nextDeadline)}
              </span>
            )}
            {tournament.defendingChampion && (
              <span className="flex items-center gap-1">
                <Crown size={12} /> vigente: {tournament.defendingChampion}
              </span>
            )}
          </div>

          {tournament.status === "inscripciones" &&
            (user ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full rounded-xl py-3 font-bold text-white disabled:opacity-60"
                style={{ background: theme.accent }}
              >
                {joining ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Inscribirme"}
              </button>
            ) : (
              <p className="text-xs text-chalkDim">Inicia sesión en Cuenta para poder inscribirte.</p>
            ))}
          {joinMsg && (
            <p className="text-xs mt-2" style={{ color: theme.accent }}>
              {joinMsg}
            </p>
          )}
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
              <Icon size={22} style={{ color: theme.accent }} />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      )}

      {view === "mis-partidos" && (
        <MyMatches tournamentId={tournamentId} tournamentType={tournament?.type} onOpenMatch={setActiveMatchId} />
      )}
      {view === "tabla" && <Standings tournamentId={tournamentId} isLiga={tournament?.type === "liga"} />}
      {view === "eliminatorias" && <Bracket tournamentId={tournamentId} />}
      {view === "resultados" && <Resultados tournamentId={tournamentId} />}
      {view === "participantes" && <Participants tournamentId={tournamentId} tournamentType={tournament?.type} />}
      {view === "equipos" && <TeamsBank teamsBank={tournament?.teamsBank} tournamentType={tournament?.type} />}
      {view === "noticias" && <Noticias news={tournament?.news || []} />}
      {view === "reglamento" && <Reglamento />}
    </div>
  );
}
