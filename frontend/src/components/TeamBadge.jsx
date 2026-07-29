import { useState } from "react";
import { Shield } from "lucide-react";
import { teamSlug } from "../modules/Torneos/teamSlug";

// "type" es "copa" o "liga" — cada torneo administra su propia carpeta de
// escudos (Mejora 2: Banco de Equipos independiente), así que la ruta de
// la foto ahora vive en frontend/public/teams/<type>/<slug>.png
export default function TeamBadge({ team, type = "copa", size = 32 }) {
  const [failed, setFailed] = useState(false);
  if (!team) return null;

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full flex items-center justify-center bg-pitchCard border border-turf shrink-0"
      >
        <Shield size={size * 0.55} className="text-chalkDim" />
      </div>
    );
  }

  return (
    <img
      src={`/teams/${type}/${teamSlug(team)}.png`}
      alt={team}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border border-turf shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
