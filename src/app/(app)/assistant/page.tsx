import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-header";
import { AiChat } from "@/components/ai/ai-chat";
import { isGroqConfigured } from "@/lib/ai/groq";
import { AI } from "@/lib/constants";

export const metadata: Metadata = { title: AI.assistantName };
export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title={AI.assistantShort}
        subtitle="Your festival assistant"
        backHref="/"
      />

      <div className="px-5 py-4">
        <AiChat
          surface="assistant"
          title={AI.assistantName}
          intro="Ask about pooja timings, events or the festival fund — and book a couple pooja right here."
          configured={isGroqConfigured}
        />
      </div>
    </>
  );
}
