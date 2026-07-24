import { useCallback, useEffect, useState } from 'react';
import { Download, Share2, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const SESSION_DISMISS_KEY = 'atlas-pwa-install-dismissed';

const isRunningStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  Boolean((window.navigator as NavigatorWithStandalone).standalone);

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent);

const wasDismissedThisSession = () => {
  try {
    return window.sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [isDismissed, setIsDismissed] = useState(wasDismissedThisSession);
  const [showIosInstructions, setShowIosInstructions] = useState(
    () => isIosDevice() && !isRunningStandalone()
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsDismissed(wasDismissedThisSession());
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowIosInstructions(false);
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      if (standaloneQuery.matches) handleInstalled();
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );
    window.addEventListener('appinstalled', handleInstalled);
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      window.sessionStorage.setItem(SESSION_DISMISS_KEY, 'true');
    } catch {
      // Le stockage privé peut être indisponible sans empêcher l’installation.
    }
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'dismissed') dismiss();
  }, [dismiss, installPrompt]);

  if (
    isInstalled ||
    isDismissed ||
    (!installPrompt && !showIosInstructions)
  ) {
    return null;
  }

  const isIosFallback = !installPrompt && showIosInstructions;

  return (
    <aside
      className="fixed bottom-20 right-3 z-[1200] w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-white shadow-2xl shadow-slate-950/35 md:bottom-4 md:right-4"
      aria-live="polite"
      aria-label="Installer l’Atlas biblique interactif"
    >
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-950/40">
          <Smartphone className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Installer l’Atlas biblique</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {isIosFallback
              ? 'Dans Safari, touchez Partager puis « Sur l’écran d’accueil ».'
              : 'Accédez plus vite à l’atlas et retrouvez la frise hors connexion.'}
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Masquer la proposition d’installation"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="border-t border-white/10 bg-white/[0.04] px-4 py-3">
        {isIosFallback ? (
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
            <Share2 className="size-4" />
            Partager → Sur l’écran d’accueil
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void install()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <Download className="size-4" />
            Installer l’application
          </button>
        )}
      </div>
    </aside>
  );
}
