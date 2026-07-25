import { useEffect, useState } from "react";
import TeamBadge from "../../components/TeamBadge";
import { tournamentsApi } from "./api";

export default function TeamsBank() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi
      .teamsBank()
      .then((data) => setTeams(data.teams))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-chalkDim">Cargando equipos…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  return (
    <div>
      <p className="text-xs text-chalkDim mb-4">
        Estos son los equipos que se pueden tocar al azar cuando arranca un torneo.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {teams.map((t) => (
          <div key={t} className="flex flex-col items-center gap-2 rounded-xl border border-turf bg-pitchCard py-4 px-2">
            <TeamBadge team={t} size={44} />
            <span className="text-xs text-center leading-tight">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
