import TeamBadge from "../../components/TeamBadge";

// Mejora 2: el banco ya no se pide al backend por separado — viene incluido
// dentro del torneo (tournament.teamsBank), que TournamentDetail ya tiene
// cargado. Cada torneo trae el suyo, exclusivo.
export default function TeamsBank({ teamsBank = [], tournamentType = "copa" }) {
  if (teamsBank.length === 0) {
    return <p className="text-sm text-chalkDim">Cargando equipos…</p>;
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
