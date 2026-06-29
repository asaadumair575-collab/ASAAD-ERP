"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
          <path
            d="M10 3v9M6.5 8.5 10 12l3.5-3.5M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Install App
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="bg-white text-black rounded-2xl p-5 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-base">Install this app</h2>
            {isIos ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                Tap the <span className="font-medium">Share</span> icon at the
                bottom of Safari, then choose{" "}
                <span className="font-medium">&quot;Add to Home Screen&quot;</span>.
              </p>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                Open this site in Chrome, tap the
                {" "}<span className="font-medium">⋮ menu</span>, then choose{" "}
                <span className="font-medium">&quot;Add to Home screen&quot;</span> or
                {" "}<span className="font-medium">&quot;Install app&quot;</span>.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="w-full bg-black text-white text-sm font-medium py-2.5 rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
