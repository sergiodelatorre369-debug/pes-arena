// "Real Madrid" -> "real-madrid" — así sabemos qué archivo de imagen buscar
// en frontend/public/teams/ para cada equipo, sin tener que guardar la ruta
// a mano en ningún lado.
export function teamSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
