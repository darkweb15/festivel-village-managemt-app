import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AI } from "@/lib/constants";

/**
 * Home-screen entry point into the assistant. Deliberately restrained — one
 * saffron card, not a floating widget that competes with the bottom navigation.
 */
export function AskAiCard() {
  return (
    <Link
      href="/assistant"
      className="card card-interactive flex items-center gap-3.5 overflow-hidden px-4 py-4"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-saffron-600 text-white">
        <Sparkles className="size-[1.15rem]" strokeWidth={2.2} aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-semibold text-ink-900">
          Ask {AI.assistantShort}
        </span>
        <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-ink-500">
          Pooja timings, availability, donations — or book a pooja by chatting
        </span>
      </span>

      <ArrowRight className="size-4 shrink-0 text-saffron-600" strokeWidth={2.4} aria-hidden />
    </Link>
  );
}
