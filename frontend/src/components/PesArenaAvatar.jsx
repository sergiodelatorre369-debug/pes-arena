import { Shield } from "lucide-react";

export default function PesArenaAvatar({ photoUrl, name, size = 96 }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border-2 border-floodlight"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full flex items-center justify-center border-2 border-floodlight bg-pitchCard"
    >
      <Shield size={size * 0.5} className="text-floodlight" />
    </div>
  );
}
