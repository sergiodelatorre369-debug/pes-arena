import { createContext, useCallback, useContext, useState } from "react";
import ProfileModal from "../modules/Perfil/ProfileModal";
import { buildPlayerProfile } from "../modules/Perfil/profileUtils";

const ProfileContext = createContext(null);

// Envuelve toda la app (una sola vez, en App.jsx). Desde ahí, cualquier
// módulo — Buscar Rival hoy, Ranking/Torneos/Chat/Campeones mañana — solo
// necesita llamar a openProfile(jugador) para mostrar la tarjeta.
export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  const openProfile = useCallback((player) => {
    setProfile(buildPlayerProfile(player));
  }, []);

  const closeProfile = useCallback(() => setProfile(null), []);

  return (
    <ProfileContext.Provider value={{ openProfile, closeProfile }}>
      {children}
      <ProfileModal profile={profile} onClose={closeProfile} />
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile debe usarse dentro de <ProfileProvider>");
  }
  return ctx;
}
