export default function NavBar({ modules, active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around items-center border-t border-turf bg-pitchCard py-2 z-50">
      {modules.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-label={label}
            className={`flex flex-col items-center gap-1 px-4 py-1 text-xs font-semibold ${
              isActive ? "text-home" : "text-chalkDim"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
