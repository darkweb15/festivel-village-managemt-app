import { NextResponse, type NextRequest } from "next/server";
import { runAgent, todayInFestivalTz } from "@/lib/ai/orchestrator";
import { isGroqConfigured } from "@/lib/ai/groq";
import {
  createClient,
  createDynamicClient,
  getCurrentAppUser,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getLocale } from "@/lib/i18n/server";
import type { Actor, AgentEvent, Surface } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Small in-memory limiter — enough to stop a single tab hammering Groq.
 * Tunable because the ceiling depends on how much Groq throughput the committee
 * has: one free account supports far fewer concurrent villagers than several.
 */
const RATE = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Math.max(
  1,
  Number(process.env.AI_RATE_LIMIT_PER_MIN) || 12,
);

function rateLimited(key: string) {
  const now = Date.now();
  const entry = RATE.get(key);
  if (!entry || now > entry.resetAt) {
    RATE.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function encodeEvent(event: AgentEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "The database is not connected yet." },
      { status: 503 },
    );
  }

  let body: { message?: string; surface?: string; sessionId?: string; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > 1000) {
    return NextResponse.json({ error: "That message is too long." }, { status: 400 });
  }

  const requestedSurface: Surface = body.surface === "copilot" ? "copilot" : "assistant";

  // Authorization: the copilot surface is only granted to a signed-in editor.
  // A public caller asking for "copilot" is silently downgraded, never upgraded.
  const appUser = await getCurrentAppUser();
  const isEditor =
    !!appUser && appUser.is_active && (appUser.role === "admin" || appUser.role === "editor");

  if (requestedSurface === "copilot" && !isEditor) {
    return NextResponse.json(
      { error: "The committee copilot requires an admin sign-in." },
      { status: 403 },
    );
  }

  const surface: Surface = requestedSurface;
  const actor: Actor =
    surface === "copilot" && appUser
      ? {
          type: "admin",
          id: appUser.id,
          email: appUser.email,
          role: appUser.role as "admin" | "editor",
        }
      : { type: "public" };

  const rateKey =
    actor.type === "admin"
      ? `admin:${actor.id}`
      : `ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"}`;

  if (rateLimited(rateKey)) {
    return NextResponse.json(
      { error: "Too many messages. Please wait a moment." },
      { status: 429 },
    );
  }

  // Checked only after the caller has been authorised, so an unauthenticated
  // probe cannot learn whether the server holds an AI key.
  if (!isGroqConfigured) {
    return NextResponse.json(
      {
        error:
          "The AI assistant is not configured yet. An administrator needs to set GROQ_API_KEY on the server.",
        code: "ai_not_configured",
      },
      { status: 503 },
    );
  }

  const history = Array.isArray(body.history)
    ? (body.history as { role?: string; content?: string }[])
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" &&
            m.content.length > 0,
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : crypto.randomUUID();

  const supabase = await createClient();
  const db = await createDynamicClient();

  // Read from the cookie rather than the request body: the language the agent
  // answers in should follow the app the person is actually looking at, and a
  // client-supplied value would be one more thing to validate.
  const locale = await getLocale();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAgent({
          surface,
          message,
          history,
          locale,
          ctx: {
            supabase,
            db,
            surface,
            sessionId,
            actor,
            today: todayInFestivalTz(),
          },
        })) {
          controller.enqueue(encodeEvent(event));
        }
        controller.enqueue(encodeEvent({ type: "done" }));
      } catch {
        controller.enqueue(
          encodeEvent({ type: "error", message: "The assistant stopped unexpectedly." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
