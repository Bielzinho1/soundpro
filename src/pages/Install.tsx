import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-6">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">App Instalado!</h1>
          <p className="text-muted-foreground">
            O SoundPro IA já está na sua tela inicial. Abra direto de lá para a melhor experiência!
          </p>
          <Button onClick={() => window.location.href = "/"} className="w-full bg-primary text-primary-foreground">
            Ir para o App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm space-y-8">
        <div className="space-y-4">
          <img src="/pwa-icon-192.png" alt="SoundPro IA" className="w-24 h-24 mx-auto rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-bold text-foreground">SoundPro IA</h1>
          <p className="text-muted-foreground text-lg">
            Instale o app no seu celular e ouça suas playlists a qualquer momento!
          </p>
        </div>

        {isIOS ? (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-left">
            <h2 className="text-lg font-semibold text-foreground text-center">Como instalar no iPhone</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Toque no botão <Share className="inline w-4 h-4" /> <strong>Compartilhar</strong> na barra do Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Toque em <strong>"Adicionar"</strong> no canto superior direito
                </p>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="w-full bg-primary text-primary-foreground text-lg py-6 rounded-xl gap-3"
          >
            <Download className="w-6 h-6" />
            Instalar App
          </Button>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-left">
            <h2 className="text-lg font-semibold text-foreground text-center">Como instalar no Android</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">1</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Toque no menu <MoreVertical className="inline w-4 h-4" /> do navegador (3 pontinhos)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">2</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">3</span>
                </div>
                <p className="text-muted-foreground text-sm pt-1">
                  Confirme tocando em <strong>"Instalar"</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 justify-center text-muted-foreground">
          <Smartphone className="w-5 h-5" />
          <span className="text-sm">Funciona offline • Tela cheia • Sem anúncios</span>
        </div>
      </div>
    </div>
  );
};

export default Install;
