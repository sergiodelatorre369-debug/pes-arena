import { useState } from "react";
import { Disc, Image, Save, Wifi, BookOpen } from "lucide-react";
import SettingsCard from "../../components/SettingsCard";
import DownloadButton from "../../components/DownloadButton";
import InfoRow from "../../components/InfoRow";
import { APP_CONFIG } from "../../config/appConfig";
import Tutorial from "./Tutorial";

export default function Configuracion() {
  const [view, setView] = useState("main");

  if (view === "tutorial") {
    return <Tutorial onBack={() => setView("main")} />;
  }

  return (
    <div className="min-h-screen bg-pitch text-chalk font-body px-5 py-8 max-w-md mx-auto">
      <h2 className="text-3xl mb-1 font-display">Configuración</h2>
      <p className="text-sm mb-6 text-chalkDim">Todo lo que necesitas para jugar online.</p>

      <div className="flex flex-col gap-4">
        <SettingsCard icon={Disc} title="ISO Oficial">
          <p className="text-sm text-chalkDim mb-1">{APP_CONFIG.isoOficial.nombre}</p>
          <p className="text-xs text-chalkDim mb-3">Versión {APP_CONFIG.isoOficial.version}</p>
          <DownloadButton href={APP_CONFIG.isoOficial.url}>Descargar ISO</DownloadButton>
        </SettingsCard>

        <SettingsCard icon={Image} title="Texturas">
          <DownloadButton href={APP_CONFIG.texturas.url}>Descargar Texturas</DownloadButton>
        </SettingsCard>

        <SettingsCard icon={Save} title="Savedata">
          <DownloadButton href={APP_CONFIG.savedata.url}>Descargar Savedata</DownloadButton>
        </SettingsCard>

        <SettingsCard icon={Wifi} title="Configuración Online">
          <InfoRow label="Red ZeroTier" value={APP_CONFIG.online.zeroTierNetworkId} copyable />
          <InfoRow label="Puerto PPSSPP" value={APP_CONFIG.online.puerto} />
          <InfoRow label="Modelo PSP" value={APP_CONFIG.online.modeloPSP} />
        </SettingsCard>

        <SettingsCard icon={BookOpen} title="Aprende a jugar Online">
          <button
            onClick={() => setView("tutorial")}
            className="inline-flex items-center justify-center w-full rounded-lg py-3 font-bold border border-turf text-chalk"
          >
            📖 Ver Tutorial
          </button>
        </SettingsCard>
      </div>
    </div>
  );
}
