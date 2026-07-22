import { useState } from "react";
import { LogOut, UserPlus, LogIn, Camera } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ProfileCard from "../Perfil/ProfileCard";
import { BACKGROUNDS } from "../Perfil/backgrounds";
import { resizeImageToDataUrl } from "./imageUtils";
import { COUNTRIES } from "./countries";

export default function Cuenta() {
  const { user, loading, register, login, logout, updateProfile } = useAuth();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRIES[0].code);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileError, setProfileError] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-pitch text-chalk font-body flex items-center justify-center">
        <p className="text-chalkDim text-sm">Cargando…</p>
      </div>
    );
  }

  if (user) {
    const profile = {
      name: user.username,
      photoUrl: user.photoUrl,
      background: user.background,
      playerId: user.playerId,
      country: user.countryFlag ? { flag: user.countryFlag, name: user.countryName } : null,
      points: user.points,
      confiabilidad: user.confiabilidad,
      memberSince: user.createdAt,
    };

    const handlePhotoChange = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // permite volver a elegir el mismo archivo después
      if (!file) return;
      setProfileError("");
      setUploadingPhoto(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        await updateProfile({ photoUrl: dataUrl });
      } catch (err) {
        setProfileError(err.message);
      } finally {
        setUploadingPhoto(false);
      }
    };

    const handleBackgroundSelect = async (id) => {
      if (id === user.background) return;
      setProfileError("");
      try {
        await updateProfile({ background: id });
      } catch (err) {
        setProfileError(err.message);
      }
    };

    return (
      <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
        <h2 className="text-3xl mb-1 font-display">Mi Cuenta</h2>
        <p className="text-sm mb-6 text-chalkDim">Bienvenido, {user.username} 👋</p>

        <ProfileCard profile={profile} />

        <label className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl py-3 font-bold border border-turf text-chalk cursor-pointer">
          <Camera size={18} />
          {uploadingPhoto ? "Subiendo…" : "Cambiar foto"}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
        </label>

        <div className="mt-6">
          <p className="text-xs font-semibold mb-2 tracking-wide text-chalkDim">FONDO DE LA TARJETA</p>
          <div className="grid grid-cols-4 gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBackgroundSelect(b.id)}
                title={b.name}
                aria-label={`Fondo ${b.name}`}
                className={`h-12 rounded-lg border-2 transition-colors ${
                  user.background === b.id ? "border-floodlight" : "border-turf"
                }`}
                style={{ background: `linear-gradient(160deg, ${b.from}, ${b.to})` }}
              />
            ))}
          </div>
        </div>

        {profileError && <p className="text-sm text-home mt-3">{profileError}</p>}

        <button
          onClick={logout}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold border border-turf text-chalkDim"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Pon tu apodo y tu contraseña.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        const country = COUNTRIES.find((c) => c.code === countryCode);
        await register({ username: username.trim(), password, country });
      } else {
        await login({ username: username.trim(), password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <h2 className="text-3xl mb-1 font-display">{mode === "register" ? "Crear cuenta" : "Iniciar sesión"}</h2>
      <p className="text-sm mb-6 text-chalkDim">
        {mode === "register"
          ? "Tu perfil se guarda para siempre — no hace falta que sean tus datos reales."
          : "Entra con tu apodo y contraseña."}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold mb-2 tracking-wide text-chalkDim">APODO</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            placeholder="Ej. Rambo77"
            className="w-full rounded-xl px-4 py-3 outline-none border border-turf bg-pitchCard text-chalk"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2 tracking-wide text-chalkDim">CONTRASEÑA</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 4 caracteres"
            className="w-full rounded-xl px-4 py-3 outline-none border border-turf bg-pitchCard text-chalk"
          />
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-xs font-semibold mb-2 tracking-wide text-chalkDim">PAÍS</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none border border-turf bg-pitchCard text-chalk"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-home">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2 bg-home text-white disabled:opacity-60"
        >
          {mode === "register" ? <UserPlus size={20} /> : <LogIn size={20} />}
          {mode === "register" ? "Crear cuenta" : "Entrar"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "register" ? "login" : "register");
          setError("");
        }}
        className="mt-4 text-sm text-chalkDim underline w-full text-center"
      >
        {mode === "register" ? "¿Ya tienes cuenta? Inicia sesión" : "¿Nuevo? Crea tu cuenta"}
      </button>
    </div>
  );
}
