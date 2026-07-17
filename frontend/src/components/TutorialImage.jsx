import { useState } from "react";
import { ImageIcon } from "lucide-react";

// Muestra la imagen del paso si existe en /public/tutorial-images/.
// Si todavía no se subió esa imagen, muestra un placeholder — así el
// tutorial funciona completo desde ya y las imágenes se agregan después
// sin tocar código, solo poniendo el archivo en esa carpeta.
export default function TutorialImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full aspect-video rounded-xl border border-dashed border-turf bg-pitchCard flex items-center justify-center">
        <ImageIcon size={32} className="text-chalkDim" />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden border border-turf bg-pitchCard">
      <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
