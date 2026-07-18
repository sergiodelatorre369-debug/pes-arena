// ---------------------------------------------------------------------------
// Estos son valores de RESPALDO nada más, por si algún día no carga
// public/config.json (por ejemplo, la primerísima vez antes de crearlo).
// EL ARCHIVO QUE DE VERDAD EDITAS ES: frontend/public/config.json
// Ese vive fuera de "src", así que copiar/reemplazar la carpeta src
// nunca lo va a borrar.
// ---------------------------------------------------------------------------
export const DEFAULT_CONFIG = {
  isoOficial: {
    nombre: "PES PPSSPP Oficial",
    version: "v1.0",
    url: "https://ejemplo.com/descargar-iso",
  },
  texturas: {
    url: "https://ejemplo.com/descargar-texturas",
  },
  savedata: {
    url: "https://ejemplo.com/descargar-savedata",
  },
  online: {
    zeroTierNetworkId: "56374ac9a4e0f579",
    puerto: "10000",
    modeloPSP: "2000 / 3000",
  },
};
