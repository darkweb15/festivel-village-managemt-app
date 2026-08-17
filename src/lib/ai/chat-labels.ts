import type { ChatLabels } from "@/components/ai/ai-chat";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";

/**
 * Chat copy for the two surfaces.
 *
 * The committee copilot is English by design, so it gets a fixed set. The
 * public assistant builds its set from the reader's dictionary, including the
 * speech-recognition tag — dictating a question in Telugu only works if the
 * recogniser is told to expect Telugu.
 */

export const COPILOT_CHAT_LABELS: ChatLabels = {
  quickActions: "Quick actions",
  bookPooja: "Book a pooja",
  todaySchedule: "Check today's schedule",
  tomorrowEvents: "Find tomorrow's events",
  availability: "Check pooja availability",
  donations: "Donation information",
  thinking: "Thinking…",
  working: "Working…",
  unavailable: "The assistant is unavailable right now.",
  connectionLost: "Connection lost. Please try again.",
  couldNotComplete: "Couldn’t complete that",
  notSwitchedOn: "The AI copilot isn’t switched on yet",
  notSwitchedOnBody:
    "An administrator needs to add a Groq API key to the server before this can answer questions.",
  placeholder: "Ask about bookings, donations or operations…",
  listening: "Listening…",
  askByVoice: "Ask by voice",
  stopListening: "Stop listening",
  message: "Message",
  send: "Send",
  stop: "Stop",
  disclaimer:
    "Answers come from the committee’s own data. Please confirm anything important before acting on it.",
  speechLang: "en-IN",
};

const SPEECH_LANG: Record<Locale, string> = {
  en: "en-IN",
  te: "te-IN",
};

export function assistantChatLabels(t: Dictionary, locale: Locale): ChatLabels {
  return {
    quickActions: t.assistant.quickActions,
    bookPooja: t.assistant.qaBookPooja,
    todaySchedule: t.assistant.qaTodaySchedule,
    tomorrowEvents: t.assistant.qaTomorrowEvents,
    availability: t.assistant.qaAvailability,
    donations: t.assistant.qaDonations,
    thinking: t.assistant.thinking,
    working: t.assistant.working,
    unavailable: t.assistant.unavailable,
    connectionLost: t.assistant.connectionLost,
    couldNotComplete: t.assistant.couldNotComplete,
    notSwitchedOn: t.assistant.notSwitchedOn,
    notSwitchedOnBody: t.assistant.notSwitchedOnBody,
    placeholder: t.assistant.placeholder,
    listening: t.assistant.listening,
    askByVoice: t.assistant.askByVoice,
    stopListening: t.assistant.stopListening,
    message: t.assistant.message,
    send: t.assistant.send,
    stop: t.assistant.stop,
    disclaimer: t.assistant.disclaimer,
    speechLang: SPEECH_LANG[locale],
  };
}
