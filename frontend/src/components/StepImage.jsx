import { useState } from "react";
import { ImageOff } from "lucide-react";

// Reutilizable: cualquier módulo futuro (Torneos, Ranking...) puede usar esto
// para mostrar una imagen con un placeholder limpio mientras no exista el archivo.
export default function StepImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div className="w-full aspect-video rounded-xl border border-turf bg-pitch flex items-center justify-center overflow-hidden mb-4">
      {showPlaceholder ? (
        <div className="flex flex-col items-center text-chalkDim text-xs gap-2">
          <ImageOff size={28} />
          Imagen próximamente
        </div>
      ) : (
        <img src={src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />
      )}
    </div>
  );
}
