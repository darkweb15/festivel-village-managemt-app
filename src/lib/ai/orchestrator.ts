import "server-only";

import {
  chatCompletion,
  GROQ_MODEL,
  GroqError,
  type ChatMessage,
  type ChatTool,
} from "@/lib/ai/groq";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { dictionaryFor } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";
import { systemPrompt } from "@/lib/ai/prompt";
import { PUBLIC_TOOLS } from "@/lib/ai/tools/public";
import { ADMIN_TOOLS } from "@/lib/ai/tools/admin";
import type {
  AgentEvent,
  Surface,
  ToolContext,
  ToolDefinition,
} from "@/lib/ai/types";
import { festivalToday, formatFullDate } from "@/lib/utils";

/** How many plan → act cycles before we stop and answer with what we have. */
const MAX_STEPS = 6;

/** Arguments are logged, so anything personal is redacted first. */
const SENSITIVE_ARGS = new Set(["phone", "email", "notes", "partner1_name", "partner2_name"]);

function redact(args: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    out[key] = SENSITIVE_ARGS.has(key) && value ? "[redacted]" : value;
  }
  return out;
}

/**
 * Tool arguments arrive as a JSON string from the model. For a tool with no
 * parameters it may legitimately send `"null"` or malformed JSON, both of which
 * must become an empty object rather than blowing up the whole turn.
 */
function parseToolArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * The registry is built per request from the surface, so admin tools are not
 * merely hidden from the public assistant — they are never in the list handed
 * to the model at all.
 */
export function toolsFor(surface: Surface): ToolDefinition[] {
  return surface === "copilot" ? [...PUBLIC_TOOLS, ...ADMIN_TOOLS] : PUBLIC_TOOLS;
}

function toChatTools(tools: ToolDefinition[]): ChatTool[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function todayInFestivalTz(): string {
  return festivalToday();
}

export type AgentTurn = {
  surface: Surface;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  ctx: ToolContext;
  /** Language the public assistant should answer in. Copilot ignores it. */
  locale?: Locale;
};

/**
 * Runs one turn of the agent, yielding events as it goes:
 *
 *   plan (LLM) → call tools → feed results back → … → final answer
 *
 * Tool execution is real: each one hits Supabase and its result — success or
 * failure — is what the model sees next. The model is never allowed to
 * fabricate a tool result, because it only ever receives them from here.
 */
export async function* runAgent(turn: AgentTurn): AsyncGenerator<AgentEvent> {
  const { surface, ctx } = turn;
  const tools = toolsFor(surface);
  // Public assistant speaks the reader's language; the copilot stays English.
  const t = dictionaryFor(
    surface === "copilot" ? "en" : (turn.locale ?? DEFAULT_LOCALE),
  );
  const byName = new Map(tools.map((t) => [t.name, t]));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt(surface, ctx.today, formatFullDate(ctx.today), turn.locale),
    },
    // Short window: history is resent on every step and Groq bills per minute.
    ...turn.history.slice(-6).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    { role: "user", content: turn.message },
  ];

  const chatTools = toChatTools(tools);

  /**
   * Mutating tools that actually succeeded this turn.
   *
   * If the model then fails to produce its closing sentence (a rate limit, a
   * dropped connection), the user must still be told that their booking was
   * created — otherwise they see an error over a real, committed change and
   * book again.
   */
  const completed: string[] = [];

  try {
    for (let step = 0; step < MAX_STEPS; step += 1) {
      yield { type: "status", label: step === 0 ? "Thinking…" : "Working…" };

      const completion = await chatCompletion({
        messages,
        tools: chatTools,
        temperature: 0.2,
        maxTokens: 900,
      });

      const choice = completion.choices[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        yield { type: "error", message: "The assistant did not respond. Please try again." };
        return;
      }

      const calls = assistantMessage.tool_calls ?? [];

      // No tool calls -> this is the final answer.
      if (calls.length === 0) {
        const text = (assistantMessage.content ?? "").trim();
        yield {
          type: "message",
          text: text || "I couldn't find an answer for that. Please try rephrasing.",
        };
        return;
      }

      messages.push({
        role: "assistant",
        content: assistantMessage.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        const tool = byName.get(call.function.name);

        if (!tool) {
          // The model asked for something outside this surface's registry.
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify({
              ok: false,
              error: "That action is not available on this surface.",
            }),
          });
          await logToolCall(ctx, call.function.name, {}, false, "tool_not_available", 0);
          continue;
        }

        yield { type: "status", label: tool.runningLabel, tool: tool.name };

        const args = parseToolArgs(call.function.arguments);

        const startedAt = Date.now();
        let result;
        try {
          result = await tool.execute(args, ctx);
        } catch (error) {
          result = {
            ok: false,
            code: "tool_error",
            summary:
              error instanceof Error ? error.message : "The action failed unexpectedly.",
          };
        }
        const duration = Date.now() - startedAt;

        await logToolCall(
          ctx,
          tool.name,
          redact(args),
          result.ok,
          result.ok ? null : (result.code ?? "failed"),
          duration,
          result.objectType,
          result.objectId,
        );

        if (result.ok && tool.mutates) completed.push(result.summary);

        yield {
          type: "tool_result",
          tool: tool.name,
          ok: result.ok,
          // Successes are safe to show. Failures show only an explicitly
          // user-facing line, so database errors and tool names never reach
          // a villager's screen.
          summary: result.ok ? result.summary : (result.userSummary ?? ""),
          data: result.ok ? result.data : undefined,
        };

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: tool.name,
          content: JSON.stringify({
            ok: result.ok,
            code: result.code,
            summary: result.summary,
            data: result.data ?? null,
          }).slice(0, 12_000),
        });
      }
    }

    // Ran out of steps — ask for a plain answer using what has been gathered.
    const wrapUp = await chatCompletion({
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Answer now in plain English using only the tool results above. Do not call any more tools.",
        },
      ],
      temperature: 0.2,
      maxTokens: 500,
    });

    yield {
      type: "message",
      text:
        wrapUp.choices[0]?.message?.content?.trim() ||
        "I gathered some information but couldn't summarise it. Please try again.",
    };
  } catch (error) {
    // Whatever went wrong afterwards, work that was already committed is real
    // and must be reported before the error.
    if (completed.length > 0) {
      yield {
        type: "message",
        text: fmt(t.assistant.aiPartialDone, { done: completed.join(" ") }),
      };
    }

    if (error instanceof GroqError) {
      yield {
        type: "error",
        message: error.rateLimited
          ? fmt(t.assistant.aiRateLimited, { wait: humanWait(error.retryAfter) })
          : error.status === 401
            ? t.assistant.aiRejected
            : t.assistant.aiUnavailable,
      };
      return;
    }
    // Surfaced to the operator, never to the villager — the user-facing text
    // stays generic while the server log keeps enough to diagnose.
    console.error("[ai] agent turn failed", {
      completedMutations: completed.length,
      surface,
      sessionId: ctx.sessionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 4).join(" | ") : undefined,
    });
    yield { type: "error", message: "Something went wrong. Please try again." };
  }
}

/**
 * Turns a Retry-After in seconds into something a villager can act on.
 * Groq's token budget resets on the hour, so the raw value can be "2089".
 */
function humanWait(seconds?: number) {
  if (!seconds || seconds < 60) return "a minute";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}

/** Writes one row to ai_action_logs via the security-definer function. */
async function logToolCall(
  ctx: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
  success: boolean,
  error: string | null,
  durationMs: number,
  objectType?: string,
  objectId?: string,
) {
  try {
    await ctx.supabase.rpc("log_ai_action", {
      p_actor_type: ctx.actor.type === "admin" ? "admin" : "public",
      p_session_id: ctx.sessionId,
      p_surface: ctx.surface,
      p_tool_name: toolName,
      p_arguments: args,
      p_success: success,
      p_error: error,
      p_object_type: objectType ?? null,
      p_object_id: objectId ?? null,
      p_duration_ms: durationMs,
      p_model: GROQ_MODEL,
    });
  } catch {
    // Logging must never break the conversation.
  }
}
