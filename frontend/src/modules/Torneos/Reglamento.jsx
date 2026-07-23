const RULES = [
  { title: "Inscripciones", text: "Cualquier jugador con cuenta puede inscribirse mientras el torneo esté en fase de inscripciones." },
  { title: "Grupos", text: "En cuanto se junta el mínimo de jugadores, el sistema arma los grupos y el calendario solo, todos contra todos." },
  { title: "Eliminatorias", text: "Los mejores de cada grupo avanzan a llaves de eliminación directa, generadas automáticamente." },
  { title: "Resultados", text: "Cada jugador sube su marcador desde la Sala del Partido. Si ambos coinciden, se aprueba solo." },
  { title: "Confiabilidad", text: "Jugar, responder y subir resultados a tiempo mantiene alta tu confiabilidad — abandonar la baja." },
];

export default function Reglamento() {
  return (
    <div className="flex flex-col gap-4">
      {RULES.map((r) => (
        <div key={r.title} className="rounded-xl border border-turf bg-pitchCard p-4">
          <h4 className="font-display text-base text-floodlight mb-1">{r.title}</h4>
          <p className="text-sm text-chalkDim">{r.text}</p>
        </div>
      ))}
    </div>
  );
}
