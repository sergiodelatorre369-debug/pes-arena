// ---------------------------------------------------------------------------
// Contenido del tutorial "Aprende a jugar Online".
// Para actualizar texto: edita los arrays de abajo, nada más.
// Para agregar una imagen: guarda el archivo en frontend/public/tutorial/
// con el nombre indicado en "image" (ej. paso-1.jpg) — no hay que tocar
// ningún componente, la imagen aparece sola en cuanto existe el archivo.
// ---------------------------------------------------------------------------
export const TUTORIAL_STEPS = [
  {
    title: "Instalar la ISO",
    image: "/tutorial/paso-1.jpg",
    items: [
      "Descarga la ISO Oficial desde Configuración.",
      "Abre ZArchiver.",
      "Descomprime el archivo.",
      "Copia la ISO.",
      "Pégala en: 📁 PSP/GAME",
    ],
  },
  {
    title: "Instalar las Texturas",
    image: "/tutorial/paso-2.jpg",
    items: [
      "Descarga las Texturas desde Configuración.",
      "Descomprime con ZArchiver.",
      "Copia la carpeta: 📁 C19EO1598",
      "Pégala en: 📁 PSP/TEXTURES",
    ],
  },
  {
    title: "Instalar el Savedata",
    image: "/tutorial/paso-3.jpg",
    items: [
      "Descarga el Savedata desde Configuración.",
      "Descomprime el archivo.",
      "Copia la carpeta: 📁 C19EO159800001000",
      "Pégala en: 📁 PSP/SAVEDATA",
    ],
  },
  {
    title: "Configurar ZeroTier",
    image: "/tutorial/paso-4.jpg",
    items: [
      "Abre ZeroTier One.",
      "Presiona ADD NETWORK.",
      "Pega la red: 56374ac9a4e0f579",
      "Activa: ✔ Router all traffic through ZeroTier",
      "Presiona Add.",
      "Ve a Settings y activa: ✔ Allow Mobile Data, ✔ Disable IPv6, ✔ Disable Connectivity Check",
      "Enciende el switch de la red.",
      "Dale clic a la red para ver Detalles, donde dice Managed IPs.",
      "Guarda en una nota 📝 tu IP: son los números ANTES de la diagonal (xx.xxx.xx.xx/xx). 👀 Ojo: después de la diagonal y la diagonal misma NO van, solo los números y puntos de antes.",
    ],
  },
  {
    title: "Configurar PPSSPP",
    image: "/tutorial/paso-5.jpg",
    items: [
      "Mantén presionado el juego durante dos segundos.",
      "Entra a: Configuración del Juego → Juego en Red",
      "Activa: ✔ Juego en Red / WLAN",
      "Puerto: 10000",
      "Después entra a: Sistema → Modelo PSP",
      "Selecciona: PSP 2000 / 3000",
    ],
  },
  {
    title: "Buscar Rival",
    image: "/tutorial/paso-6.jpg",
    items: [
      "Abre PES ARENA.",
      "Presiona Buscar Rival.",
      "Espera el emparejamiento.",
      "El jugador Local va a compartir su IP mediante el chat.",
    ],
  },
  {
    title: "Colocar la IP",
    image: "/tutorial/paso-7.jpg",
    items: [
      "Entra en PPSSPP: Juego en Red → Cambiar dirección IP del servidor PRO Adhoc",
      "Pega la IP que te mandó el jugador Local.",
    ],
  },
  {
    title: "Crear o Entrar a la Sala",
    image: "/tutorial/paso-8.jpg",
    items: [
      "Jugador Local: Amistoso → Adhoc → Crear Sala",
      "Jugador Visitante: Amistoso → Adhoc → Buscar Sala",
    ],
  },
];
