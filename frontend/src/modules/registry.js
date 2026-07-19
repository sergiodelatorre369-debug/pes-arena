import { Swords, Settings, UserCircle2 } from "lucide-react";
import BuscarRival from "./BuscarRival/BuscarRival";
import Configuracion from "./Configuracion/Configuracion";
import Cuenta from "./Cuenta/Cuenta";

// Para agregar un módulo nuevo (Ranking, Torneos, Estadísticas, Noticias...):
// 1. Crea su carpeta en src/modules/<Nombre>/ con su propio componente.
// 2. Agrega una línea aquí abajo con su id, etiqueta, ícono y componente.
// No hace falta tocar App.jsx ni NavBar.jsx.
export const MODULES = [
  { id: "buscar-rival", label: "Jugar", icon: Swords, component: BuscarRival },
  { id: "cuenta", label: "Cuenta", icon: UserCircle2, component: Cuenta },
  { id: "configuracion", label: "Config", icon: Settings, component: Configuracion },
];
