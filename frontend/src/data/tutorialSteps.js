import { APP_CONFIG } from "../config/appConfig";

// ---------------------------------------------------------------------------
// Contenido del tutorial "Aprende a jugar Online".
// Cada paso: título, nombre de imagen (vive en /public/tutorial-images/) y
// lista de instrucciones. Para editar el tutorial, solo cambia este archivo.
// ---------------------------------------------------------------------------
export const TUTORIAL_STEPS = [
  {
    title: "Instalar la ISO",
    image: "paso1.jpg",
    items: [
      "Descarga la ISO Oficial.",
      "Abre ZArchiver.",
      "Descomprime el archivo.",
      "Copia la ISO.",
      "Pégala en: 📁 PSP/GAME",
    ],
  },
  {
    title: "Instalar las Texturas",
    image: "paso2.jpg",
    items: [
      "Descarga las Texturas.",
      "Descomprime con ZArchiver.",
      "Copia la carpeta: 📁 C19EO1598",
      "Pégala en: 📁 PSP/TEXTURES",
    ],
  },
  {
    title: "Instalar el Savedata",
    image: "paso3.jpg",
    items: [
      "Descarga el Savedata.",
      "Descomprime.",
      "Copia la carpeta: 📁 C19EO159800001000",
      "Pégala en: 📁 PSP/SAVEDATA",
    ],
  },
  {
    title: "Configurar ZeroTier",
    image: "paso4.jpg",
    items: [
      "Abre ZeroTier One.",
      "Presiona ADD NETWORK.",
      `Pega la red: ${APP_CONFIG.online.zeroTierNetworkId}`,
      "Activa: ✔ Router all traffic through ZeroTier",
      "Presiona Add.",
      "Ve a Settings y activa: ✔ Allow Mobile Data, ✔ Disable IPv6, ✔ Disable Connectivity Check",
      "Enciende el switch de la red.",
    ],
  },
  {
    title: "Configurar PPSSPP",
    image: "paso5.jpg",
    items: [
      "Mantén presionado el juego durante dos segundos.",
      "Entra a: Configuración del Juego → Juego en Red.",
      "Activa: ✔ Juego en Red / WLAN",
      `Puerto: ${APP_CONFIG.online.puerto}`,
      "Después entra a: Sistema → Modelo PSP.",
      `Selecciona: PSP ${APP_CONFIG.online.modeloPSP}`,
    ],
  },
  {
    title: "Buscar Rival",
    image: "paso6.jpg",
    items: [
      "Abre PES ARENA.",
      "Presiona Buscar Rival.",
      "Espera el emparejamiento.",
      "El jugador Local compartirá su IP mediante el chat.",
    ],
  },
  {
    title: "Colocar la IP",
    image: "paso7.jpg",
    items: [
      "Entra en PPSSPP: Juego en Red → Cambiar dirección IP del servidor PRO Adhoc.",
      "Pega la IP enviada por el jugador Local.",
    ],
  },
  {
    title: "Crear o Entrar a la Sala",
    image: "paso8.jpg",
    items: [
      "Jugador Local: Amistoso → Adhoc → Crear Sala.",
      "Jugador Visitante: Amistoso → Adhoc → Buscar Sala.",
    ],
  },
];
