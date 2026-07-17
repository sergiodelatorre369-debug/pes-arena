import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function InfoRow({ label, value, copyable }) {
  const [copied, setCopied] = useState(false);

  const doCopy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-pitch px-3 py-2 mb-2 last:mb-0">
      <div>
        <div className="text-xs text-chalkDim">{label}</div>
        <div className="font-mono2 text-sm">{value}</div>
      </div>
      {copyable && (
        <button onClick={doCopy} aria-label={`Copiar ${label}`} className="text-floodlight">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
}
