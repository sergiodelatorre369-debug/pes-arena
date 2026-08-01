import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import TeamBadge from "../../components/TeamBadge";
import { tournamentsApi } from "./api";

export default function TeamsBank({ tournamentId, tournamentType = "copa" }) {
  const [teamsBank, setTeamsBank] = useState(null); // null = todavía no se sabe, [] = de verdad vacío
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("");

  const load = () => {
    setError("");
    setDebug(`Pidiendo datos del torneo (id: ${tournamentId || "NO LLEGÓ NINGÚN ID"})…`);
    tournamentsApi
      .detail(tournamentId)
      .then((data) => {
        const bank = data?.tournament?.teamsBank;
        const raw = JSON.stringify(data).slice(0, 600);
        setDebug(`Texto crudo recibido (tipo de teamsBank: ${typeof bank}, es-array: ${Array.isArray(bank)}):\n${raw}`);
        setTeamsBank(Array.isArray(bank) ? bank : []);
      })
      .catch((err) => {
        setDebug(`Falló la petición: ${err.message}`);
        setError(err.message);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  return (
    <div>
      {/* Línea de diagnóstico temporal — para ver exactamente qué está pasando */}
      <p className="text-[10px] text-chalkDim mb-4 border border-dashed border-turf rounded-lg p-2 whitespace-pre-wrap break-all">
        🔧 {debug}
      </p>

      {error && <p className="text-sm text-home mb-4">{error}</p>}

      {teamsBank === null && !error && <p className="text-sm text-chalkDim">Cargando equipos…</p>}

      {teamsBank !== null && teamsBank.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-turf p-8 text-center">
          <p className="text-chalkDim text-sm mb-3">Este torneo todavía no tiene equipos cargados.</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-xs rounded-full px-4 py-2 border border-turf text-chalkDim"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}

      {teamsBank !== null && teamsBank.length > 0 && (
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
      )}
    </div>
  );
}
