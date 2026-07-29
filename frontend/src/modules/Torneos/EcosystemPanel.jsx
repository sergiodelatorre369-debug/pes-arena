import { Users, Trophy, Swords, AlertCircle } from "lucide-react";

const ITEMS = [
  { key: "totalPlayers", icon: Users, label: "Jugadores registrados" },
  { key: "activeTournaments", icon: Trophy, label: "Torneos activos" },
  { key: "matchesInPlay", icon: Swords, label: "Partidos jugándose" },
  { key: "conflictsPending", icon: AlertCircle, label: "Conflictos por resolver" },
];

export default function EcosystemPanel({ ecosystem }) {
  if (!ecosystem) return null;

  return (
    <div className="rounded-xl border border-turf bg-pitchCard p-4 mb-6">
      <p className="text-xs tracking-widest uppercase text-floodlight mb-3">🌍 Ecosistema PES ARENA</p>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ key, icon: Icon, label }) => (
          <div key={key} className="flex items-center gap-2">
            <Icon size={16} className="text-chalkDim shrink-0" />
            <div>
              <div className="font-display text-lg leading-none">{ecosystem[key] ?? 0}</div>
              <div className="text-[10px] text-chalkDim">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
