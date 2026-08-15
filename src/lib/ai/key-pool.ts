import "server-only";

/**
 * Groq API key pool with per-key cooldown and failover.
 *
 * Intended use is ONE Groq account. Multiple keys are supported for a single
 * legitimate reason: rotating a key without taking the assistant offline — add
 * the new key, confirm traffic flows, then remove the old one.
 *
 * This is deliberately NOT a way around a provider's rate limits. Groq meters
 * per organization, so extra keys from one account share one budget; using keys
 * from several accounts to raise the ceiling breaches Groq's terms and risks
 * every key being banned at once. If the committee needs more throughput, the
 * answer is a paid plan or fewer tokens per turn.
 *
 * Keys are never logged — only a fingerprint (last four characters).
 */

type KeyState = {
  key: string;
  /** Last four characters, for logs. */
  fingerprint: string;
  /** Epoch ms before which this key should not be used again. */
  cooldownUntil: number;
  /** Set when the key is rejected outright (401/403); never retried after. */
  disabled: boolean;
  failures: number;
};

function parseKeys(): string[] {
  const raw = [process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY]
    .filter(Boolean)
    .join(",");

  const seen = new Set<string>();
  return raw
    .split(/[,\s]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 20)
    .filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

const states: KeyState[] = parseKeys().map((key) => ({
  key,
  fingerprint: `…${key.slice(-4)}`,
  cooldownUntil: 0,
  disabled: false,
  failures: 0,
}));

let cursor = 0;

export const keyCount = states.length;
export const hasKeys = states.length > 0;

export type LeasedKey = { key: string; fingerprint: string };

/**
 * Next usable key, or `null` when every key is disabled or cooling down.
 * Round-robin so load spreads evenly rather than hammering the first key.
 */
export function leaseKey(): LeasedKey | null {
  const now = Date.now();

  for (let i = 0; i < states.length; i += 1) {
    const state = states[(cursor + i) % states.length];
    if (state.disabled) continue;
    if (state.cooldownUntil > now) continue;

    cursor = (cursor + i + 1) % states.length;
    return { key: state.key, fingerprint: state.fingerprint };
  }

  return null;
}

/** Seconds until the soonest key becomes usable again, for the "try later" copy. */
export function secondsUntilAnyKeyFree(): number {
  const now = Date.now();
  const waits = states
    .filter((s) => !s.disabled)
    .map((s) => Math.max(0, Math.ceil((s.cooldownUntil - now) / 1000)));

  if (waits.length === 0) return 0;
  return Math.min(...waits);
}

export function reportRateLimited(fingerprint: string, retryAfterSeconds: number) {
  const state = states.find((s) => s.fingerprint === fingerprint);
  if (!state) return;
  // Cap the cooldown so one long Retry-After cannot park a key for hours.
  const seconds = Math.min(Math.max(retryAfterSeconds || 30, 5), 900);
  state.cooldownUntil = Date.now() + seconds * 1000;
}

export function reportRejected(fingerprint: string) {
  const state = states.find((s) => s.fingerprint === fingerprint);
  if (!state) return;
  state.disabled = true;
  console.error(
    `[ai] Groq key ${fingerprint} was rejected and has been disabled for this process.`,
  );
}

export function reportSuccess(fingerprint: string) {
  const state = states.find((s) => s.fingerprint === fingerprint);
  if (!state) return;
  state.cooldownUntil = 0;
  state.failures = 0;
}

/** Diagnostic snapshot. Contains fingerprints only — never a key. */
export function poolStatus() {
  const now = Date.now();
  return states.map((s) => ({
    fingerprint: s.fingerprint,
    disabled: s.disabled,
    coolingFor: Math.max(0, Math.ceil((s.cooldownUntil - now) / 1000)),
  }));
}
