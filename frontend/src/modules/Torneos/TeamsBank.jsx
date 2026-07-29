import TeamBadge from "../../components/TeamBadge";

// Mejora 2: el banco ya no se pide al backend por separado — viene incluido
// dentro del torneo (tournament.teamsBank), que TournamentDetail ya tiene
// cargado. Cada torneo trae el suyo, exclusivo.
export default function TeamsBank({ teamsBank = [], tournamentType = "copa" }) {
  if (teamsBank.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm mb-1">Este torneo todavía no tiene equipos cargados.</p>
        <p className="text-chalkDim text-xs">
          Si esto no cambia después de recargar, revisa <code>backend/src/teams.js</code> y que la base de
          datos tenga el campo <code>teamsBank</code> lleno para este torneo.
        </p>
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
