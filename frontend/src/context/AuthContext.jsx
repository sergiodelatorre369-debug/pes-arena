import { createContext, useCallback, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "pesarena_token";
const API_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("sesión inválida");
      const data = await res.json();
      setUser(data.user);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      loadMe(token);
    } else {
      setLoading(false);
    }
  }, [loadMe]);

  const register = async ({ username, password, country }) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        countryCode: country?.code,
        countryName: country?.name,
        countryFlag: country?.flag,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo crear la cuenta.");
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const login = async ({ username, password }) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const updateProfile = async (partial) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const res = await fetch(`${API_URL}/api/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo actualizar tu perfil.");
    setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
