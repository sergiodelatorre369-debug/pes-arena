import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, PartyPopper, Swords } from "lucide-react";
import StepImage from "../../components/StepImage";
import { getTutorialSteps } from "./tutorialContent";

export default function Tutorial({ onBack, onNavigate, config }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const TUTORIAL_STEPS = getTutorialSteps(config);
  const total = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const goNext = () => {
    if (isLast) {
      setCompleted(true);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, total - 1));
  };

  const goPrev = () => {
    if (completed) {
      setCompleted(false);
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const goToBuscarRival = () => {
    if (onNavigate) onNavigate("buscar-rival");
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <PartyPopper size={44} className="text-floodlight mb-4" />
        <h2 className="text-3xl mb-2 font-display">¡Configuración completada!</h2>
        <p className="text-chalkDim mb-8 max-w-xs">Ya tienes todo listo para jugar online en PES ARENA.</p>
        <button
          onClick={goToBuscarRival}
          className="w-full rounded-xl py-4 font-bold text-lg flex items-center justify-center gap-2 bg-home text-white"
        >
          <Swords size={20} /> Ir a Buscar Rival
        </button>
        <button onClick={goPrev} className="mt-4 text-sm text-chalkDim">
          Volver a revisar los pasos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-6 text-chalkDim">
        <ArrowLeft size={16} /> Salir del tutorial
      </button>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-chalkDim mb-2">
          <span>
            Paso {stepIndex + 1} de {total}
          </span>
          <span>{Math.round(((stepIndex + 1) / total) * 100)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-pitchCard overflow-hidden">
          <div
            className="h-full bg-home transition-all"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <StepImage src={step.image} alt={step.title} />

      <h2 className="text-2xl mb-3 font-display">{step.title}</h2>

      <ul className="flex flex-col gap-2 mb-8">
        {step.items.map((item, i) => {
          const isPath = item.trim().startsWith("📁");
          return (
            <li
              key={i}
              className={`text-sm ${
                isPath ? "font-mono2 bg-pitchCard rounded-lg px-3 py-2 text-floodlight" : "text-chalk"
              }`}
            >
              {!isPath && "• "}
              {item}
            </li>
          );
        })}
      </ul>

      <div className="flex gap-3">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl py-3 font-bold border border-turf text-chalk disabled:opacity-40"
        >
          <ChevronLeft size={18} /> Anterior
        </button>
        <button
          onClick={goNext}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl py-3 font-bold bg-home text-white"
        >
          Siguiente <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
