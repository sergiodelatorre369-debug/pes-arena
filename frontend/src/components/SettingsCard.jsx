export default function SettingsCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-turf bg-pitchCard p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={18} className="text-floodlight" />}
        <h3 className="font-display text-lg tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}
