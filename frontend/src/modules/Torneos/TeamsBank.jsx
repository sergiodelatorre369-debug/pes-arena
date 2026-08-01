import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import TeamBadge from "../../components/TeamBadge";
import { tournamentsApi } from "./api";

// Cada torneo (Copa/Liga) trae su propio banco de equipos exclusivo,
// guardado en tournament.teamsBank. Este componente lo busca directo,
// para siempre mostrar el banco del torneo correcto, sin depender de
// que otra pantalla se lo haya pasado ya cargado.
export default function TeamsBank({ tournamentId, tournamentType = "copa" }) {
  const [teamsBank, setTeamsBank] = useState(null); // null = todavía cargando, [] = de verdad vacío
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    tournamentsApi
      .detail(tournamentId)
      .then((data) => {
        const bank = data?.tournament?.teamsBank;
        setTeamsBank(Array.isArray(bank) ? bank : []);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (error) return <p className="text-sm text-home">{error}</p>;
  if (teamsBank === null) return <p className="text-sm text-chalkDim">Cargando equipos…</p>;

  if (teamsBank.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm mb-3">Este torneo todavía no tiene equipos cargados.</p>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 text-xs rounded-full px-4 py-2 border border-turf text-chalkDim"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-chalkDim mb-4">
        Estos son los equipos exclusivos de este torneo — se reparten al azar cuando arranca.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {teamsBank.map((t) => (
          <div key={t} className="flex flex-col items-center gap-2 rounded-xl border border-turf bg-pitchCard py-4 px-2">
            <TeamBadge team={t} type={tournamentType} size={44} />
            <span className="text-xs text-center leading-tight">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
