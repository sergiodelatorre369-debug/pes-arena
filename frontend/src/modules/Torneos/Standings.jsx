import { useEffect, useState } from "react";
import { tournamentsApi } from "./api";

export default function Standings({ tournamentId }) {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    tournamentsApi
      .standings(tournamentId)
      .then((data) => setStandings(data.standings))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <p className="text-sm text-chalkDim">Cargando tabla…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  return (
    <div className="flex flex-col gap-6">
      {standings.map((group) => (
        <div key={group.groupName}>
          <h3 className="font-display text-lg mb-2 text-floodlight">Grupo {group.groupName}</h3>
          <div className="rounded-xl border border-turf overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-pitchCard text-chalkDim">
                <tr>
                  <th className="text-left px-3 py-2">Jugador</th>
                  <th className="px-1.5 py-2">PJ</th>
                  <th className="px-1.5 py-2">PG</th>
                  <th className="px-1.5 py-2">PE</th>
                  <th className="px-1.5 py-2">PP</th>
                  <th className="px-1.5 py-2">DG</th>
                  <th className="px-1.5 py-2">PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.table.map((row, i) => (
                  <tr key={row.userId} className={i % 2 === 0 ? "bg-pitch" : "bg-pitchCard"}>
                    <td className="text-left px-3 py-2 font-semibold">{row.player?.username || "?"}</td>
                    <td className="text-center px-1.5 py-2">{row.pj}</td>
                    <td className="text-center px-1.5 py-2">{row.pg}</td>
                    <td className="text-center px-1.5 py-2">{row.pe}</td>
                    <td className="text-center px-1.5 py-2">{row.pp}</td>
                    <td className="text-center px-1.5 py-2">{row.dg}</td>
                    <td className="text-center px-1.5 py-2 font-bold text-floodlight">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
