import { Newspaper } from "lucide-react";

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  return `hace ${Math.floor(s / 86400)}d`;
}

// Recibe las noticias ya cargadas por TournamentDetail (mismo dato que ya
// se poll-ea cada 5s), así no duplicamos otra llamada al backend.
export default function Noticias({ news = [] }) {
  const sorted = [...news].sort((a, b) => b.ts - a.ts);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-turf p-8 text-center">
        <p className="text-chalkDim text-sm">Todavía no hay noticias. En cuanto pase algo importante, aparece aquí.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((n) => (
        <div key={n.id} className="flex items-start gap-3 rounded-xl border border-turf bg-pitchCard px-4 py-3">
          <Newspaper size={16} className="text-floodlight mt-0.5 shrink-0" />
          <div>
            <p className="text-sm">{n.text}</p>
            <p className="text-xs text-chalkDim mt-0.5">{timeAgo(n.ts)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
