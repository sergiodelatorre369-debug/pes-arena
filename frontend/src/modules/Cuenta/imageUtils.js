// Redimensiona una imagen a un cuadro máximo y la comprime a JPEG,
// devolviendo un data URL listo para guardar. Así la foto de perfil
// nunca pesa más de unos cuantos KB, sin necesitar un servicio externo
// de almacenamiento de archivos.
export function resizeImageToDataUrl(file, maxSize = 220, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ese archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
