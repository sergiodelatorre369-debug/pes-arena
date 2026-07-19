import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ProfileCard from "./ProfileCard";

export default function ProfileModal({ profile, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [profile]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  if (!profile) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(15, 28, 19, 0.85)" }}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-sm transition-all duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button onClick={handleClose} aria-label="Cerrar perfil" className="text-chalkDim hover:text-chalk">
            <X size={22} />
          </button>
        </div>
        <ProfileCard profile={profile} />
      </div>
    </div>
  );
}
