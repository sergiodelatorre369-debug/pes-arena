import { useEffect, useState } from "react";
import { tournamentsApi } from "./api";

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function Resultados({ tournamentId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      tournamentsApi
        .results(tournamentId)
        .then((data) => setResults(data.results))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  if (loading) return <p className="text-sm text-chalkDim">Cargando resultados…</p>;
  if (error) return <p className="text-sm text-home">{error}</p>;

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm">Todavía no hay partidos aprobados. En cuanto se juegue el primero, aparece aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {results.map((r) => (
        <div key={r.id} className="rounded-xl border border-turf bg-pitchCard px-4 py-3">
          <div className="flex items-center justify-between text-xs text-chalkDim mb-1">
            <span>{r.round}</span>
            <span>{formatDate(r.approvedAt)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={r.scoreA > r.scoreB ? "font-bold text-floodlight" : ""}>{r.playerA?.username}</span>
            <span className="font-mono2 px-2">{r.scoreA} - {r.scoreB}</span>
            <span className={r.scoreB > r.scoreA ? "font-bold text-floodlight" : ""}>{r.playerB?.username}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
