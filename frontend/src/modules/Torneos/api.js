// Mismo nombre de llave que usa AuthContext.jsx para guardar la sesión.
const TOKEN_KEY = "pesarena_token";
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Algo falló.");
  return data;
}

export const tournamentsApi = {
  list: () => request("/api/tournaments"),
  detail: (id) => request(`/api/tournaments/${id}`),
  join: (id) => request(`/api/tournaments/${id}/join`, { method: "POST" }),
  participants: (id) => request(`/api/tournaments/${id}/participants`),
  standings: (id) => request(`/api/tournaments/${id}/standings`),
  bracket: (id) => request(`/api/tournaments/${id}/bracket`),
  myMatches: (id) => request(`/api/tournaments/${id}/my-matches`),
  matchDetail: (matchId) => request(`/api/tournaments/matches/${matchId}`),
  sendMessage: (matchId, text, type) =>
    request(`/api/tournaments/matches/${matchId}/message`, { method: "POST", body: JSON.stringify({ text, type }) }),
  shareIp: (matchId, ip) =>
    request(`/api/tournaments/matches/${matchId}/ip`, { method: "POST", body: JSON.stringify({ ip }) }),
  reportResult: (matchId, scoreA, scoreB) =>
    request(`/api/tournaments/matches/${matchId}/report`, { method: "POST", body: JSON.stringify({ scoreA, scoreB }) }),
};
