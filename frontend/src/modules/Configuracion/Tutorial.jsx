import { ArrowLeft, BookOpen } from "lucide-react";

export default function Tutorial({ onBack }) {
  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6 text-chalkDim">
        <ArrowLeft size={16} /> Volver
      </button>
      <div className="flex flex-col items-center text-center mt-16">
        <BookOpen size={40} className="text-floodlight mb-4" />
        <h2 className="text-3xl mb-2 font-display">Aprende a jugar Online</h2>
        <p className="text-chalkDim max-w-xs">
          Aquí va a ir el tutorial paso a paso para configurar PPSSPP y ZeroTier. Todavía no está listo — vuelve pronto.
        </p>
      </div>
    </div>
  );
}
