import type { Metadata } from "next";
import { AiChat } from "@/components/ai/ai-chat";
import { isGroqConfigured } from "@/lib/ai/groq";
import { COPILOT_CHAT_LABELS } from "@/lib/ai/chat-labels";
import { AI } from "@/lib/constants";

export const metadata: Metadata = { title: "AI Committee Copilot" };
export const dynamic = "force-dynamic";

export default function CopilotPage() {
  return (
    <>
      <header className="mb-5">
        <h1 className="t-h1 text-ink-900">{AI.copilotShort}</h1>
        <p className="t-small mt-1 max-w-[42rem] text-ink-500">
          Ask about bookings, donations, expenses and volunteers. The copilot reads
          live data and can make permitted changes — announcements are always
          drafted for your approval before they are published.
        </p>
      </header>

      <div className="card px-4 py-4 sm:px-6 sm:py-6">
        <AiChat
          surface="copilot"
          title={AI.copilotName}
          intro="Operational questions answered from the committee's live data, with real actions where you allow them."
          // The admin panel stays English regardless of the public app's language.
          labels={COPILOT_CHAT_LABELS}
          configured={isGroqConfigured}
        />
      </div>
    </>
  );
}
