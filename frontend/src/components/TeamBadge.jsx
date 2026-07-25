import { useState } from "react";
import { Shield } from "lucide-react";
import { teamSlug } from "../modules/Torneos/teamSlug";

export default function TeamBadge({ team, size = 32 }) {
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
      src={`/teams/${teamSlug(team)}.png`}
      alt={team}
      style={{ width: size, height: size }}
      className="rounded-full object-cover border border-turf shrink-0"
      onError={() => setFailed(true)}
    />
  );
}
