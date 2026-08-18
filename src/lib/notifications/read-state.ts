"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { NotificationDigest } from "@/lib/supabase/types";

/**
 * Read/unread state for the notification feed — per device, per browser.
 *
 * The public app has no accounts: a villager opens a link, they do not sign in.
 * So "have I seen this?" cannot live in Postgres without inventing an identity
 * for someone who never asked for one, and the notifications table stays
 * genuinely read-only for the public. It lives in localStorage instead, which
 * is exactly the right scope for it — the phone that read the notice is the
 * thing that knows it was read.
 *
 * The shape is a watermark plus a short list of exceptions:
 *
 *   readAt — everything published at or before this instant has been seen.
 *            Marking all as read just moves it forward.
 *   ids    — individual notifications tapped since then, so opening one entry
 *            out of five does not clear the other four.
 *
 * A watermark rather than a list of every id ever seen: the list would grow
 * without bound across a festival, and a notification older than the watermark
 * can never become unread again anyway.
 */

const STORAGE_KEY = "sv_notifications_read";

/** Same-tab notification that the stored value changed; `storage` only fires cross-tab. */
const CHANGE_EVENT = "sv:notifications-read";

/**
 * Exceptions above the watermark. Far more than a reader will ever accumulate
 * between two "mark all as read" taps — the cap only exists so a pathological
 * case cannot grow the entry without limit.
 */
const MAX_IDS = 200;

export type ReadState = {
  /** ISO timestamp, or null on a device that has never opened the app. */
  readAt: string | null;
  ids: string[];
};

const UNSEEDED: ReadState = { readAt: null, ids: [] };

function parse(raw: string | null): ReadState {
  if (!raw) return UNSEEDED;
  try {
    const value = JSON.parse(raw) as Partial<ReadState> | null;
    if (!value || typeof value !== "object") return UNSEEDED;
    return {
      readAt: typeof value.readAt === "string" ? value.readAt : null,
      ids: Array.isArray(value.ids)
        ? value.ids.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    // Someone else's key, a half-written value, a browser that clears storage
    // mid-write: treat anything unreadable as "this device is new".
    return UNSEEDED;
  }
}

function write(next: ReadState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing, or storage full. Read state is a convenience, never a
    // correctness requirement — the feed itself is unaffected.
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// -----------------------------------------------------------------------------
// Store plumbing
// -----------------------------------------------------------------------------

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The raw string, not the parsed object: React compares snapshots with
 * `Object.is`, and a fresh object on every read would loop forever.
 */
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The server has no idea what this device has read, so it renders the calm
 * state — no dots, no count — and React swaps in the real one after hydration.
 * That is the right way round: a badge that appears is far less jarring than
 * one that flashes and disappears.
 */
function getServerSnapshot(): string | null {
  return null;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export type UnreadState = {
  /** Ids the reader has not seen. Empty until hydration finishes. */
  unread: Set<string>;
  count: number;
  /** False during SSR and first paint, so nothing renders that can't be known yet. */
  ready: boolean;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

/**
 * Unread status for a list of notifications, newest first.
 *
 * Pass the full feed on the notifications screen, or the lightweight digest
 * anywhere that only needs a count.
 */
export function useUnread(items: readonly NotificationDigest[]): UnreadState {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const state = useMemo(() => parse(raw), [raw]);

  const unread = useMemo(() => {
    // Never seeded: this device has not opened the app before, so nothing here
    // is news to it — the festival simply happened before it arrived. The
    // watermark is planted on the first tap of "mark all as read", or by the
    // first notification that arrives after this visit.
    if (!state.readAt) return new Set<string>();

    const seen = new Set(state.ids);
    const watermark = state.readAt;
    return new Set(
      items
        .filter((item) => item.published_at > watermark && !seen.has(item.id))
        .map((item) => item.id),
    );
  }, [items, state]);

  const markAllRead = useCallback(() => {
    // The newest thing on screen becomes the watermark. `now` is the floor so a
    // device that has seen an empty feed still records that it looked.
    const newest = items.reduce(
      (max, item) => (item.published_at > max ? item.published_at : max),
      new Date().toISOString(),
    );
    write({ readAt: newest, ids: [] });
  }, [items]);

  const markRead = useCallback(
    (id: string) => {
      const current = parse(getSnapshot());
      if (current.ids.includes(id)) return;
      write({
        readAt: current.readAt,
        ids: [id, ...current.ids].slice(0, MAX_IDS),
      });
    },
    // Reads storage directly rather than closing over `state`, so two taps in
    // the same frame cannot drop the first one.
    [],
  );

  return {
    unread,
    count: unread.size,
    ready: raw !== null,
    markAllRead,
    markRead,
  };
}

/**
 * Plant the watermark on a device that has never had one, without marking
 * anything as read that arrives later.
 *
 * Called once when the bell or the feed first renders. Without it a returning
 * reader would be told that every notice from the whole festival is new.
 */
export function seedReadState() {
  if (parse(getSnapshot()).readAt) return;
  write({ readAt: new Date().toISOString(), ids: [] });
}
