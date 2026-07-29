import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import TeamBadge from "../../components/TeamBadge";
import { getTheme } from "./themes";

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// La asignación real del equipo ya ocurrió en el servidor (al azar, justo
// cuando arrancó el torneo) — esta ruleta REVELA ese resultado con una
// animación, no decide nada nuevo. Por eso siempre termina exactamente en
// "team", sin importar en qué orden gire.
export default function SorteoOficial({ tournament, team, onDone }) {
  const [spinning, setSpinning] = useState(true);
  const [displayTeam, setDisplayTeam] = useState(team);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const bank = tournament?.teamsBank?.length > 0 ? tournament.teamsBank : [team];
    const others = shuffle(bank.filter((t) => t !== team));
    const sequence = [];
    while (sequence.length < 22) sequence.push(...others);
    sequence.length = 22;
    sequence.push(team); // el último frame siempre es el resultado real

    let step = 0;
    const runStep = () => {
      setDisplayTeam(sequence[step]);
      step++;
      if (step >= sequence.length) {
        setSpinning(false);
        return;
      }
      const delay = 60 + step * step * 2.5; // se va frenando poco a poco
      timeoutRef.current = setTimeout(runStep, delay);
    };
    runStep();

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const theme = getTheme(tournament?.theme);

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-10 max-w-md mx-auto flex flex-col items-center justify-center text-center">
      <p className="text-xs tracking-widest uppercase mb-2" style={{ color: theme.accent }}>
        🎰 Sorteo Oficial PES ARENA
      </p>
      <h2 className="font-display text-2xl mb-8">{tournament?.name}</h2>

      <div
        className="w-full rounded-2xl border-2 p-8 mb-8 flex flex-col items-center gap-4"
        style={{ borderColor: theme.accent, background: `linear-gradient(160deg, ${theme.accentDim}, #0F1C13)` }}
      >
        <TeamBadge team={displayTeam} type={tournament?.type} size={72} />
        <p
          className={`font-display text-2xl transition-opacity ${spinning ? "opacity-70" : "opacity-100"}`}
          style={{ color: spinning ? "#EDEAE0" : theme.accent }}
        >
          {displayTeam}
        </p>
      </div>

      {spinning ? (
        <p className="text-sm text-chalkDim">Girando…</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-6" style={{ color: theme.accent }}>
            <PartyPopper size={20} />
            <p className="font-semibold">¡Te tocó {team}!</p>
          </div>
          <button
            onClick={onDone}
            className="w-full rounded-xl py-4 font-bold text-lg text-white"
            style={{ background: theme.accent }}
          >
            Entrar al torneo
          </button>
        </>
      )}
    </div>
  );
}
