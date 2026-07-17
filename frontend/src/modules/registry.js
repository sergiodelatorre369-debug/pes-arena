import { Swords, Settings } from "lucide-react";
import BuscarRival from "./BuscarRival/BuscarRival";
import Configuracion from "./Configuracion/Configuracion";

// Para agregar un módulo nuevo (Ranking, Torneos, Perfil, Estadísticas, Noticias...):
// 1. Crea su carpeta en src/modules/<Nombre>/ con su propio componente.
// 2. Agrega una línea aquí abajo con su id, etiqueta, ícono y componente.
// No hace falta tocar App.jsx ni NavBar.jsx.
export const MODULES = [
  { id: "buscar-rival", label: "Jugar", icon: Swords, component: BuscarRival },
  { id: "configuracion", label: "Config", icon: Settings, component: Configuracion },
];
