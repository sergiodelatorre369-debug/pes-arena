// ---------------------------------------------------------------------------
// Arma un perfil "de vitrina" a partir de los datos que existen hoy (apodo).
// Cuando exista el sistema de cuentas (base de datos), este helper se
// alimentará de datos reales en vez de rellenar con valores vacíos —
// el resto del módulo (ProfileCard, ProfileModal) no necesita cambiar.
// ---------------------------------------------------------------------------
export function buildPlayerProfile(player) {
  return {
    id: player?.socketId || player?.id || "invitado",
    playerId: player?.playerId || null,
    name: player?.nickname || "Jugador invitado",
    photoUrl: player?.photoUrl || null,
    background: player?.background || "clasico",
    country: player?.country || null, // ej. { flag: "🇲🇽", name: "México" } cuando exista
    points: typeof player?.points === "number" ? player.points : null,
    memberSince: player?.memberSince || null,

    // Preparado para el futuro sistema de emparejamiento inteligente.
    // Este dato NUNCA se muestra en el perfil — es de uso interno.
    confiabilidad: typeof player?.confiabilidad === "number" ? player.confiabilidad : null,
  };
}
