"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertTriangle,
  ArrowUp,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  Check,
  ClipboardList,
  Clock,
  HeartHandshake,
  Loader2,
  Megaphone,
  Mic,
  Receipt,
  Sparkles,
  Square,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { toolDoneLabel } from "@/lib/ai/labels";
import { cn } from "@/lib/utils";

type Turn =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      steps: { tool: string; ok: boolean; summary: string; data?: unknown }[];
      error?: string;
    };

/**
 * One session id per browser tab, generated lazily the first time a message is
 * sent. Deliberately not a ref or state: it must not be touched during render,
 * and it only needs to group rows in the AI audit log.
 */
let cachedSessionId: string | null = null;
function sessionKey() {
  cachedSessionId ??= crypto.randomUUID();
  return cachedSessionId;
}

/**
 * Quick actions live here, in the client module, because a Lucide icon is a
 * React component and components cannot be serialised across the
 * server → client boundary. Passing them down from a page threw at render.
 */
type QuickAction = {
  /**
   * A ChatLabels key on the public assistant, so it can be translated; a plain
   * English string on the committee copilot, which is English by design. The
   * prompt actually sent to the model is always English either way.
   */
  label: string;
  prompt: string;
  icon: LucideIcon;
};

const ASSISTANT_ACTIONS: QuickAction[] = [
  {
    label: "bookPooja",
    prompt: "I want to book a couple pooja. What is available?",
    icon: CalendarHeart,
  },
  {
    label: "todaySchedule",
    prompt: "What is the pooja schedule for today?",
    icon: Clock,
  },
  {
    label: "tomorrowEvents",
    prompt: "What events are happening tomorrow?",
    icon: CalendarDays,
  },
  {
    label: "availability",
    prompt: "Are there any couple pooja slots available?",
    icon: Users,
  },
  {
    label: "donations",
    prompt: "How can I donate, and how much has been raised so far?",
    icon: HeartHandshake,
  },
];

const COPILOT_ACTIONS: QuickAction[] = [
  {
    label: "Tomorrow's bookings",
    prompt: "How many couples are booked tomorrow?",
    icon: CalendarCheck,
  },
  { label: "Which pooja is almost full?", prompt: "Which pooja is almost full?", icon: Users },
  {
    label: "Tomorrow's preparation summary",
    prompt: "Give me tomorrow's festival preparation summary.",
    icon: ClipboardList,
  },
  {
    label: "Verified donations today",
    prompt: "What are today's verified donations?",
    icon: Wallet,
  },
  {
    label: "This week's spending",
    prompt: "How much did we spend this week?",
    icon: Receipt,
  },
  {
    label: "Draft an announcement",
    prompt: "Draft an announcement for tomorrow's pooja.",
    icon: Megaphone,
  },
];

/**
 * Every reader-facing string in the chat, supplied by whichever surface mounts
 * it. The public assistant passes translated copy; the committee copilot passes
 * English, because the admin panel is English by design.
 */
export type ChatLabels = {
  quickActions: string;
  bookPooja: string;
  todaySchedule: string;
  tomorrowEvents: string;
  availability: string;
  donations: string;
  thinking: string;
  working: string;
  unavailable: string;
  connectionLost: string;
  couldNotComplete: string;
  notSwitchedOn: string;
  notSwitchedOnBody: string;
  placeholder: string;
  listening: string;
  askByVoice: string;
  stopListening: string;
  message: string;
  send: string;
  stop: string;
  disclaimer: string;
  /** BCP-47 tag for speech recognition, e.g. "en-IN" / "te-IN". */
  speechLang: string;
};

type Props = {
  surface: "assistant" | "copilot";
  title: string;
  intro: string;
  labels: ChatLabels;
  /** Rendered instead of the composer when the server has no Groq key. */
  configured: boolean;
};

/**
 * Shared chat surface for both the public assistant and the admin copilot.
 *
 * The transport is newline-delimited JSON rather than plain text, so the UI can
 * show what the agent is actually doing — which tool is running, whether it
 * succeeded — instead of a generic spinner.
 */
export function AiChat({ surface, title, intro, labels, configured }: Props) {
  const suggestions = surface === "copilot" ? COPILOT_ACTIONS : ASSISTANT_ACTIONS;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, status]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      const history = turns
        .filter((t) => (t.role === "assistant" ? t.content : true))
        .map((t) => ({ role: t.role, content: t.content }));

      setTurns((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "", steps: [] },
      ]);
      setInput("");
      setBusy(true);
      setStatus(labels.thinking);

      const controller = new AbortController();
      abortRef.current = controller;

      const patchLast = (fn: (turn: Extract<Turn, { role: "assistant" }>) => void) =>
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") fn(last);
          return next;
        });

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            surface,
            sessionId: sessionKey(),
            history,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          patchLast((t) => {
            t.error = payload?.error ?? labels.unavailable;
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let event: {
              type: string;
              label?: string;
              text?: string;
              message?: string;
              tool?: string;
              ok?: boolean;
              summary?: string;
              data?: unknown;
            };
            try {
              event = JSON.parse(line);
            } catch {
              continue;
            }

            if (event.type === "status") setStatus(event.label ?? labels.working);
            if (event.type === "tool_result") {
              patchLast((t) =>
                t.steps.push({
                  tool: event.tool ?? "",
                  ok: Boolean(event.ok),
                  summary: event.summary ?? "",
                  data: event.data,
                }),
              );
            }
            if (event.type === "message") patchLast((t) => (t.content = event.text ?? ""));
            if (event.type === "error") patchLast((t) => (t.error = event.message));
          }
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          patchLast((t) => (t.error = labels.connectionLost));
        }
      } finally {
        setBusy(false);
        setStatus(null);
        abortRef.current = null;
      }
    },
    [busy, labels, surface, turns],
  );

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
    setStatus(null);
  }

  return (
    <div className="flex min-h-[60dvh] flex-col">
      <div className="flex-1 space-y-4">
        {turns.length === 0 ? (
          <Intro
            title={title}
            intro={intro}
            labels={labels}
            suggestions={suggestions}
            disabled={!configured || busy}
            onPick={send}
          />
        ) : null}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-[1.125rem] rounded-br-md bg-saffron-600 px-4 py-2.5 text-[0.875rem] leading-relaxed text-white">
                {turn.content}
              </p>
            </div>
          ) : (
            <AssistantTurn
              key={i}
              turn={turn}
              labels={labels}
              status={i === turns.length - 1 && busy ? status : null}
            />
          ),
        )}

        <div ref={endRef} />
      </div>

      <Composer
        labels={labels}
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        onStop={stop}
        busy={busy}
        configured={configured}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Intro({
  title,
  intro,
  labels,
  suggestions,
  disabled,
  onPick,
}: {
  title: string;
  intro: string;
  labels: ChatLabels;
  suggestions: QuickAction[];
  disabled: boolean;
  onPick: (text: string) => void;
}) {
  return (
    <div className="py-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-600 text-white shadow-[0_10px_24px_-10px_rgba(234,83,8,0.8)]">
          <GaneshaMark className="size-8" strokeWidth={2} />
        </span>
        <h2 className="t-h2 mt-4 text-ink-900">{title}</h2>
        <p className="t-small mx-auto mt-1.5 max-w-[20rem] text-ink-500">{intro}</p>
      </div>

      <p className="t-label mt-7 mb-2.5 px-1 text-ink-400">{labels.quickActions}</p>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={disabled}
            onClick={() => onPick(s.prompt)}
            className="press group flex w-full items-center gap-3 rounded-tile border border-ink-200 bg-white px-4 py-3 text-left transition-colors hover:border-saffron-300 hover:bg-saffron-50 disabled:opacity-50"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[0.625rem] bg-saffron-50 text-saffron-600 transition-colors group-hover:bg-white">
              <s.icon className="size-4" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="t-small min-w-0 flex-1 font-medium text-ink-800">
              {(labels as Record<string, string>)[s.label] ?? s.label}
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-ink-300 transition-all duration-[--duration-fast] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-saffron-600"
              strokeWidth={2.2}
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}

type Step = { tool: string; ok: boolean; summary: string; data?: unknown };

/** Drops a step when it repeats the one immediately before it. */
function dedupeSteps(steps: Step[]): Step[] {
  return steps.filter(
    (step, i) =>
      i === 0 ||
      step.tool !== steps[i - 1].tool ||
      step.summary !== steps[i - 1].summary ||
      step.ok !== steps[i - 1].ok,
  );
}

function AssistantTurn({
  turn,
  labels,
  status,
}: {
  turn: Extract<Turn, { role: "assistant" }>;
  labels: ChatLabels;
  status: string | null;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-saffron-50 text-saffron-600">
        <Sparkles className="size-4" strokeWidth={2.2} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        {turn.steps.length > 0 ? (
          <ul className="space-y-1.5">
            {/* The model sometimes repeats a read to double-check itself; showing
                the identical line twice reads as a glitch, so collapse runs. */}
            {dedupeSteps(turn.steps).map((step, i) => (
              <li
                key={i}
                className={cn(
                  "animate-rise flex items-start gap-2 rounded-tile px-3 py-2",
                  step.ok
                    ? "bg-success-50 text-success-700"
                    : "bg-gold-100 text-gold-700",
                )}
              >
                {step.ok ? (
                  <Check className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.6} aria-hidden />
                ) : (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
                )}
                <span className="min-w-0">
                  {/* Villagers see what happened, never the tool's function
                      name. A failure with no user-safe detail shows the
                      heading alone rather than a database message. */}
                  <span className="t-caption block font-semibold">
                    {step.ok ? toolDoneLabel(step.tool) : labels.couldNotComplete}
                  </span>
                  {step.summary ? (
                    <span className="t-caption block opacity-90">{step.summary}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {status ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5 text-[0.75rem] font-medium text-ink-600">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {status}
          </p>
        ) : null}

        {turn.content ? (
          <div className="rounded-[1.125rem] rounded-tl-md bg-ink-50 px-4 py-3">
            <p className="text-[0.875rem] leading-relaxed whitespace-pre-line text-ink-800">
              {turn.content}
            </p>
          </div>
        ) : null}

        {turn.error ? (
          <p
            role="alert"
            className="rounded-tile bg-danger-50 px-3.5 py-3 text-[0.8125rem] leading-relaxed text-danger-700"
          >
            {turn.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Composer({
  labels,
  value,
  onChange,
  onSend,
  onStop,
  busy,
  configured,
}: {
  labels: ChatLabels;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  configured: boolean;
}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Feature detection is a browser fact, not component state — reading it
  // through useSyncExternalStore keeps the server render stable and avoids a
  // state-setting effect on mount.
  const voiceSupported = useSyncExternalStore(
    noSubscribe,
    readVoiceSupported,
    () => false,
  );

  // The recogniser is created on first use rather than on mount, so browsers
  // never see a speech object for a user who does not press the button.
  function ensureRecognition() {
    if (recognitionRef.current) return recognitionRef.current;
    const Ctor = speechCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = labels.speechLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript ?? "";
      if (text) onChange(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    return recognition;
  }

  useEffect(
    () => () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* already stopped */
      }
    },
    [],
  );

  if (!configured) {
    return (
      <div className="sticky bottom-0 mt-4 rounded-card border border-dashed border-ink-300 bg-ink-50 px-4 py-4 text-center">
        <p className="text-[0.8125rem] font-medium text-ink-700">
          {labels.notSwitchedOn}
        </p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-500">
          {labels.notSwitchedOnBody}
        </p>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 mt-4 bg-white pt-3 pb-1">
      <div className="flex items-end gap-2 rounded-[1.5rem] border border-ink-200 bg-white p-1.5 shadow-[0_2px_12px_-6px_rgba(26,22,19,0.18)] focus-within:border-saffron-400">
        {voiceSupported ? (
          <button
            type="button"
            aria-label={listening ? labels.stopListening : labels.askByVoice}
            onClick={() => {
              const recognition = ensureRecognition();
              if (!recognition) return;
              if (listening) {
                recognition.stop();
                setListening(false);
              } else {
                try {
                  recognition.start();
                  setListening(true);
                } catch {
                  setListening(false);
                }
              }
            }}
            className={cn(
              "press grid size-10 shrink-0 place-items-center rounded-full transition-colors",
              listening
                ? "bg-danger-50 text-danger-700"
                : "text-ink-400 hover:bg-ink-100 hover:text-ink-700",
            )}
          >
            <Mic className="size-[1.1rem]" strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder={listening ? labels.listening : labels.placeholder}
          aria-label={labels.message}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.875rem] leading-relaxed text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />

        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label={labels.stop}
            className="press grid size-10 shrink-0 place-items-center rounded-full bg-ink-200 text-ink-700"
          >
            <Square className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim()}
            aria-label={labels.send}
            className="press grid size-10 shrink-0 place-items-center rounded-full bg-saffron-600 text-white transition-opacity disabled:opacity-40"
          >
            <ArrowUp className="size-[1.1rem]" strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>

      <p className="mt-2 px-2 text-center text-[0.6875rem] leading-relaxed text-ink-400">
        {labels.disclaimer}
      </p>
    </div>
  );
}

function speechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};
const readVoiceSupported = () => speechCtor() !== null;

/** Minimal shape of the Web Speech API we rely on. */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: (event: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
  onend: () => void;
  onerror: () => void;
};
