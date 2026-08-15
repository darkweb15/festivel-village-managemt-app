import "server-only";

/**
 * Minimal Groq client.
 *
 * Groq exposes an OpenAI-compatible chat-completions endpoint, so a plain fetch
 * is enough — no SDK, no extra dependency, and nothing that could accidentally
 * be bundled into client code. The `server-only` import above makes importing
 * this from a client component a build error, which is the real guarantee that
 * GROQ_API_KEY never reaches the browser.
 */

import {
  hasKeys,
  keyCount,
  leaseKey,
  reportRateLimited,
  reportRejected,
  reportSuccess,
  secondsUntilAnyKeyFree,
} from "@/lib/ai/key-pool";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Tool-use capable model. Override with GROQ_MODEL if the committee prefers another. */
export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export const isGroqConfigured = hasKeys;
export const groqKeyCount = keyCount;

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | { role: "tool"; content: string; tool_call_id: string; name?: string };

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatCompletion = {
  choices: {
    message: { role: "assistant"; content: string | null; tool_calls?: ToolCall[] };
    finish_reason: string;
  }[];
  usage?: { total_tokens?: number };
};

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** True for 429s — the caller can tell "busy" apart from "broken". */
    readonly rateLimited = false,
    /** Seconds Groq asked us to wait, when it said. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "GroqError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One non-streaming completion. The agent loop streams progress itself. */
export async function chatCompletion({
  messages,
  tools,
  temperature = 0.2,
  maxTokens = 1024,
  signal,
}: {
  messages: ChatMessage[];
  tools?: ChatTool[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<ChatCompletion> {
  if (!isGroqConfigured) {
    throw new GroqError("No Groq API key is set on the server.");
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
  });

  // Try each usable key once. A key that 429s is put in cooldown and the next
  // key is tried immediately — far better than sleeping. Only when every key is
  // cooling do we wait once and retry, because an agent turn makes several
  // calls and a busy minute legitimately returns 429.
  //
  // Note: keys minted from the same Groq account share one budget, so with a
  // single account this loop will find every key rate-limited together. That is
  // expected, not a bug.
  const maxAttempts = Math.max(keyCount, 1) + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const lease = leaseKey();

    if (!lease) {
      const wait = secondsUntilAnyKeyFree();
      const slept = attempt === 0 && wait > 0 && wait <= 8 && !signal?.aborted;
      if (slept) {
        await sleep(wait * 1000);
        continue;
      }
      throw new GroqError("All Groq keys are rate limited.", 429, true, wait || 30);
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lease.key}`,
      },
      body,
      signal,
    });

    if (response.ok) {
      reportSuccess(lease.fingerprint);
      return (await response.json()) as ChatCompletion;
    }

    const text = await response.text().catch(() => "");

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after")) || 0;
      reportRateLimited(lease.fingerprint, retryAfter);
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      reportRejected(lease.fingerprint);
      // Another key may still be valid, so keep going rather than failing here.
      continue;
    }

    // Never echo a key or the full request back to the caller.
    throw new GroqError(
      `Groq request failed (${response.status}). ${text.slice(0, 300)}`,
      response.status,
    );
  }

  const wait = secondsUntilAnyKeyFree();
  throw new GroqError(
    keyCount > 1
      ? `All ${keyCount} Groq keys are unavailable.`
      : "Groq rate limit reached.",
    429,
    true,
    wait || 30,
  );
}
