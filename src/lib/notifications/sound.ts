"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The notification chime.
 *
 * Synthesised with the Web Audio API rather than shipped as an audio file. A
 * chime is two short sine tones; encoding that as an mp3 would add a network
 * request and tens of kilobytes to a phone on village 3G, for a sound this file
 * describes in a dozen lines. It also plays instantly and works offline.
 *
 * Deliberately quiet and short. This fires while someone is reading the app, so
 * it should register at the edge of attention and be over before it becomes an
 * interruption — a temple bell heard from the next street, not an alarm.
 */

const MUTE_KEY = "sv_notification_sound";
const CHANGE_EVENT = "sv:notification-sound";

/** Peak gain. Low on purpose — a notice is not an emergency. */
const PEAK = 0.07;

// A rising perfect fifth: A5 then E6. Consonant, resolves upward, reads as
// "something arrived" rather than "something is wrong".
const NOTES = [
  { hz: 880, at: 0, hold: 0.28 },
  { hz: 1318.5, at: 0.09, hold: 0.34 },
];

let context: AudioContext | null = null;
let unlocked = false;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

/**
 * Browsers refuse to start audio until the person has interacted with the page,
 * and that refusal is correct — nobody wants a site that makes noise before
 * they have touched it. So the context is created and resumed on the first real
 * gesture, and until then `playChime` simply does nothing.
 */
export function armAudio() {
  if (unlocked) return;
  const ctx = audioContext();
  if (!ctx) return;
  void ctx.resume().then(
    () => {
      unlocked = ctx.state === "running";
    },
    () => {
      unlocked = false;
    },
  );
}

export function playChime() {
  if (!isSoundEnabled()) return;
  const ctx = audioContext();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;

  // One shared gain stage, so the two notes blend instead of stacking to double
  // the volume where they overlap.
  const master = ctx.createGain();
  master.gain.value = 1;

  // Takes the glassy edge off a raw sine and leaves something rounder.
  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 2600;

  master.connect(warmth).connect(ctx.destination);

  for (const note of NOTES) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = note.hz;

    const gain = ctx.createGain();
    const start = now + note.at;
    // Short attack so it sounds struck rather than faded in, then an
    // exponential tail — how a struck bell actually decays.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(PEAK, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.hold);

    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + note.hold + 0.02);
  }
}

// -----------------------------------------------------------------------------
// Mute preference — per device, like read state
// -----------------------------------------------------------------------------

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Sound is on unless this device has explicitly turned it off. */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return readPreference();
}

export function setSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, enabled ? "on" : "off");
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  // Turning it back on is itself a gesture, so this is a legal moment to arm
  // the audio context — and a good moment to prove the sound works.
  if (enabled) {
    armAudio();
    window.setTimeout(playChime, 120);
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(MUTE_KEY) ?? "on";
  } catch {
    return "on";
  }
}

/** The server cannot know this device's choice; it renders the default. */
function getServerSnapshot(): string {
  return "on";
}

export function useSoundEnabled(): [boolean, (next: boolean) => void] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((next: boolean) => setSoundEnabled(next), []);
  return [raw !== "off", set];
}
