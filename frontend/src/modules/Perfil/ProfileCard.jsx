import { Share2, Globe2 } from "lucide-react";
import PesArenaAvatar from "../../components/PesArenaAvatar";
import { getBackground } from "./backgrounds";

function formatDate(dateStr) {
  if (!dateStr) return "No disponible";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "No disponible";
  }
}

export default function ProfileCard({ profile }) {
  const bg = getBackground(profile.background);

  return (
    <div
      className="rounded-2xl border border-floodlight/30 p-6 text-center shadow-xl"
      style={{ background: `linear-gradient(160deg, ${bg.from}, ${bg.to})` }}
    >
      <div className="flex justify-center mb-4">
        <PesArenaAvatar photoUrl={profile.photoUrl} name={profile.name} size={96} />
      </div>

      <h3 className="text-2xl font-display tracking-wide mb-1">{profile.name}</h3>

      {profile.playerId && <p className="text-xs font-mono2 text-floodlight mb-3">{profile.playerId}</p>}

      <div className="flex items-center justify-center gap-2 text-sm text-chalkDim mb-4">
        {profile.country ? (
          <>
            <span className="text-lg leading-none">{profile.country.flag}</span>
            <span>{profile.country.name}</span>
          </>
        ) : (
          <>
            <Globe2 size={14} />
            <span>País no especificado</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 mb-6">
        <div className="inline-flex flex-col items-center rounded-xl px-6 py-3 border border-floodlight/40 bg-pitch/60 min-w-[92px]">
          <span className="text-3xl font-display text-floodlight">{profile.points ?? "—"}</span>
          <span className="text-xs tracking-widest text-chalkDim">PUNTOS</span>
        </div>
        {typeof profile.confiabilidad === "number" && (
          <div className="inline-flex flex-col items-center rounded-xl px-6 py-3 border border-floodlight/40 bg-pitch/60 min-w-[92px]">
            <span className="text-3xl font-display text-floodlight">{profile.confiabilidad}%</span>
            <span className="text-xs tracking-widest text-chalkDim">CONFIABLE</span>
          </div>
        )}
      </div>

      <p className="text-xs text-chalkDim mb-6">Miembro desde: {formatDate(profile.memberSince)}</p>

      <button className="inline-flex items-center justify-center gap-2 w-full rounded-xl py-3 font-bold border border-floodlight text-floodlight hover:bg-floodlight hover:text-pitch transition-colors duration-200">
        <Share2 size={18} /> Compartir Perfil
      </button>
    </div>
  );
}
