import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Which AI surface a request came from. Determines which tools exist at all. */
export type Surface = "assistant" | "copilot";

export type Actor =
  | { type: "public" }
  | { type: "admin"; id: string; email: string; role: "admin" | "editor" };

export type ToolContext = {
  supabase: SupabaseClient<Database>;
  /** Untyped client for the few tools that address tables dynamically. */
  db: SupabaseClient;
  surface: Surface;
  sessionId: string;
  actor: Actor;
  /** Today's date in the committee's timezone, as YYYY-MM-DD. */
  today: string;
};

export type ToolResult = {
  ok: boolean;
  /**
   * One short line for the MODEL. May contain technical detail — schema hints,
   * database errors, tool names — because the model needs it to recover.
   * Never rendered verbatim to a villager on failure.
   */
  summary: string;
  /**
   * Optional line that is safe to SHOW. Successful results display `summary`;
   * failures display this, and if it is absent the UI shows only a neutral
   * "couldn't complete that" heading.
   */
  userSummary?: string;
  /** Structured payload handed back to the model as JSON. */
  data?: unknown;
  /** Set on failures so the model can react rather than invent. */
  code?: string;
  objectType?: string;
  objectId?: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema for the arguments, sent to Groq verbatim. */
  parameters: Record<string, unknown>;
  scope: "public" | "admin";
  /** Shown in the UI while the tool runs, e.g. "Checking availability…". */
  runningLabel: string;
  /** True when the tool changes data — used for logging and confirmation rules. */
  mutates?: boolean;
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<ToolResult>;
};

/** Events streamed to the browser as newline-delimited JSON. */
export type AgentEvent =
  | { type: "status"; label: string; tool?: string }
  | {
      type: "tool_result";
      tool: string;
      ok: boolean;
      summary: string;
      data?: unknown;
    }
  | { type: "message"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };
