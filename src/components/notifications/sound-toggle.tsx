"use client";

import { Bell, BellOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useSoundEnabled } from "@/lib/notifications/sound";
import { cn } from "@/lib/utils";

/**
 * Notification sound on/off, as a Settings row.
 *
 * Built from the same switch vocabulary as the rest of the app. Flipping it on
 * plays the chime once, because a sound setting you cannot hear while setting
 * it is a guess — and because that tap is also the gesture the browser needs
 * before it will allow audio at all.
 */
export function SoundToggleRow() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useSoundEnabled();

  return (
    <div className="flex w-full items-center gap-3.5 px-4 py-3.5">
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[0.875rem] transition-colors",
          enabled ? "bg-saffron-50 text-saffron-600" : "bg-ink-100 text-ink-500",
        )}
      >
        {enabled ? (
          <Bell className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        ) : (
          <BellOff className="size-[1.1rem]" strokeWidth={2} aria-hidden />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-ink-900">
          {t.settings.sound}
        </span>
        <span className="mt-0.5 block text-[0.75rem] text-ink-500">
          {enabled ? t.settings.soundOn : t.settings.soundOff}
        </span>
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t.settings.soundAria}
        onClick={() => setEnabled(!enabled)}
        className={cn(
          "press relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600",
          enabled ? "bg-saffron-600" : "bg-ink-300",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow-sm",
            "transition-[left] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            enabled ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}
