"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Makes `#announcement-<id>` style deep links actually land on the item.
 *
 * A notification points at the thing it is about — `/pooja#pooja-<id>` — but
 * the browser's native anchor jump happens once, at navigation, and every list
 * in this app streams in behind a Suspense boundary. By the time the row exists
 * the browser has long since given up, and the reader is left at the top of a
 * screen wondering which entry changed.
 *
 * So: look for the target, and if it isn't there yet, watch the document until
 * it appears — then scroll to it and mark it briefly, so the answer to "which
 * one?" is visible without reading. Gives up after a few seconds; a stale link
 * to a deleted pooja simply leaves the reader on the schedule.
 */

const GIVE_UP_AFTER_MS = 6000;
const HIGHLIGHT_MS = 2400;
const HIGHLIGHT_CLASS = "deep-link-target";

export function DeepLinkFocus() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let giveUpTimer: number | undefined;
    let highlightTimer: number | undefined;

    function cleanup() {
      observer?.disconnect();
      observer = null;
      window.clearTimeout(giveUpTimer);
    }

    function reveal(element: HTMLElement) {
      cancelled = true;
      cleanup();

      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.classList.add(HIGHLIGHT_CLASS);
      highlightTimer = window.setTimeout(() => {
        element.classList.remove(HIGHLIGHT_CLASS);
      }, HIGHLIGHT_MS);
    }

    function attempt() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;

      const existing = document.getElementById(id);
      if (existing) {
        reveal(existing);
        return;
      }

      // Not rendered yet — the list is still streaming. Watch for it.
      cleanup();
      cancelled = false;
      observer = new MutationObserver(() => {
        if (cancelled) return;
        const found = document.getElementById(id);
        if (found) reveal(found);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      giveUpTimer = window.setTimeout(cleanup, GIVE_UP_AFTER_MS);
    }

    attempt();
    window.addEventListener("hashchange", attempt);

    return () => {
      window.removeEventListener("hashchange", attempt);
      window.clearTimeout(highlightTimer);
      cleanup();
    };
    // Re-runs on navigation: the hash survives a client-side route change, and
    // the target only exists once the new screen has rendered.
  }, [pathname]);

  return null;
}
