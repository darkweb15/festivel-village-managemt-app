import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-header";
import { AiChat } from "@/components/ai/ai-chat";
import { isGroqConfigured } from "@/lib/ai/groq";
import { assistantChatLabels } from "@/lib/ai/chat-labels";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.assistant.metaTitle };
}

export const dynamic = "force-dynamic";

/**
 * The public assistant.
 *
 * Everything the villager reads comes from the dictionary, and the agent itself
 * is told which language to answer in (see `systemPrompt`) — so a Telugu reader
 * gets a Telugu conversation, not a Telugu frame around English answers. The
 * tools and their arguments are untouched.
 */
export default async function AssistantPage() {
  const { locale, t } = await getI18n();

  return (
    <>
      <PageHeader
        title={t.brand.assistantShort}
        subtitle={t.assistant.subtitle}
        backHref="/"
      />

      <div className="px-5 py-4">
        <AiChat
          surface="assistant"
          title={t.brand.assistantName}
          intro={t.assistant.intro}
          labels={assistantChatLabels(t, locale)}
          configured={isGroqConfigured}
        />
      </div>
    </>
  );
}
