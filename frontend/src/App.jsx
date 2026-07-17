import { useState } from "react";
import { MODULES } from "./modules/registry";
import NavBar from "./components/NavBar";

export default function App() {
  const [activeId, setActiveId] = useState(MODULES[0].id);
  const active = MODULES.find((m) => m.id === activeId) || MODULES[0];
  const ActiveModule = active.component;

  return (
    <>
      <div className="pb-16">
        <ActiveModule onNavigate={setActiveId} />
      </div>
      <NavBar modules={MODULES} active={activeId} onChange={setActiveId} />
    </>
  );
}
