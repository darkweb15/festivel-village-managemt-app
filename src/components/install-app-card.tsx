"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const standaloneQuery = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia(standaloneQuery);
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}

function readStandalone() {
  return (
    window.matchMedia(standaloneQuery).matches ||
    // Safari's non-standard flag for home-screen apps.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

const noSubscribe = () => () => {};
const readIsIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const serverFalse = () => false;

/**
 * Chrome/Edge/Android fire `beforeinstallprompt`, so we can offer a real
 * install button. iOS Safari never does, so it gets the manual instructions.
 *
 * Both browser facts are read through `useSyncExternalStore` so the server
 * render is stable and hydration doesn't need a state-setting effect.
 */
export function InstallAppCard() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const installed = useSyncExternalStore(
    subscribeStandalone,
    readStandalone,
    serverFalse,
  );
  const isIOS = useSyncExternalStore(noSubscribe, readIsIOS, serverFalse);

  useEffect(() => {
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <div className="card flex items-center gap-3.5 px-4 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-success-50 text-success-700">
          <CheckCircle2 className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-[0.875rem] font-medium text-ink-900">
          Installed on this device
        </p>
      </div>
    );
  }

  return (
    <div className="card px-5 py-5">
      <div className="flex items-center gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-saffron-50 text-saffron-600">
          <Download className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-ink-900">
            Add to home screen
          </h2>
          <p className="mt-0.5 text-[0.75rem] text-ink-500">
            Opens full screen, like an app
          </p>
        </div>
      </div>

      {deferred ? (
        <Button
          className="mt-4 w-full"
          onClick={async () => {
            await deferred.prompt();
            await deferred.userChoice;
            setDeferred(null);
          }}
        >
          Install app
        </Button>
      ) : isIOS ? (
        <p className="mt-4 flex gap-2 rounded-tile bg-ink-50 p-3.5 text-[0.8125rem] leading-relaxed text-ink-600">
          <Share className="mt-px size-4 shrink-0 text-ink-400" strokeWidth={2} aria-hidden />
          <span>
            Tap <span className="font-medium text-ink-900">Share</span>, then{" "}
            <span className="font-medium text-ink-900">Add to Home Screen</span>.
          </span>
        </p>
      ) : (
        <p className="mt-4 rounded-tile bg-ink-50 p-3.5 text-[0.8125rem] leading-relaxed text-ink-600">
          Use your browser menu and choose{" "}
          <span className="font-medium text-ink-900">Install app</span> or{" "}
          <span className="font-medium text-ink-900">Add to Home screen</span>.
        </p>
      )}
    </div>
  );
}
