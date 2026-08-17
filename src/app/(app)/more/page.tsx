import type { Metadata } from "next";
import {
  CalendarClock,
  CalendarHeart,
  HandHeart,
  Handshake,
  Info,
  MapPin,
  Megaphone,
  Phone,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { CommitteeEmblem } from "@/components/brand/committee-emblem";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { ShareAppRow } from "@/components/share-app-row";
import { LanguageSwitcherRow } from "@/components/language-switcher";
import { getDictionary } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.more.title };
}

export default async function MorePage() {
  const t = await getDictionary();

  return (
    <>
      <header
        className="bg-white px-5 pb-6"
        style={{ paddingTop: "calc(var(--safe-top) + 1.75rem)" }}
      >
        <div className="flex flex-col items-center text-center">
          <CommitteeEmblem className="w-24 sm:w-32" />
          <div className="mt-3 min-w-0">
            <h1 className="text-[1.125rem] leading-tight font-bold tracking-[-0.025em] text-ink-900">
              {t.brand.name}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-ink-500">{t.brand.festival}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-6">
        {/* Language first: someone who cannot read the rest of this screen
            needs to find this row without reading it. */}
        <LanguageSwitcherRow />

        <ListGroup title={t.more.groupFestival}>
          <ListRow
            icon={Sparkles}
            label={fmt(t.more.askAi, { assistant: t.brand.assistantShort })}
            description={t.more.askAiBody}
            tone="saffron"
            href="/assistant"
          />
          <ListRow
            icon={CalendarHeart}
            label={t.more.bookPooja}
            description={t.more.bookPoojaBody}
            tone="gold"
            href="/book"
          />
          <ListRow
            icon={Radio}
            label={t.more.live}
            description={t.more.liveBody}
            tone="danger"
            href="/live"
          />
          <ListRow
            icon={CalendarClock}
            label={t.more.timings}
            description={t.more.timingsBody}
            tone="saffron"
            href="/pooja"
          />
          <ListRow
            icon={Info}
            label={t.more.info}
            description={t.more.infoBody}
            tone="gold"
            href="/festival"
          />
          <ListRow
            icon={Megaphone}
            label={t.more.announcements}
            description={t.more.announcementsBody}
            tone="info"
            href="/announcements"
          />
        </ListGroup>

        <ListGroup title={t.more.groupCommunity}>
          <ListRow
            icon={Users}
            label={t.more.committee}
            description={t.more.committeeBody}
            tone="saffron"
            href="/committee"
          />
          <ListRow
            icon={HandHeart}
            label={t.more.volunteers}
            description={t.more.volunteersBody}
            tone="success"
            href="/volunteers"
          />
          <ListRow
            icon={Handshake}
            label={t.more.sponsors}
            description={t.more.sponsorsBody}
            tone="gold"
            href="/sponsors"
          />
        </ListGroup>

        <ListGroup title={t.more.groupReach}>
          <ListRow
            icon={MapPin}
            label={t.more.location}
            description={t.more.locationBody}
            tone="info"
            href="/location"
          />
          <ListRow
            icon={Phone}
            label={t.more.contact}
            description={t.more.contactBody}
            tone="neutral"
            href="/contact"
          />
        </ListGroup>

        <ListGroup title={t.more.groupApp}>
          <ListRow
            icon={Settings2}
            label={t.more.settings}
            description={t.more.settingsBody}
            tone="neutral"
            href="/settings"
          />
          <ShareAppRow />
          <ListRow
            icon={ShieldCheck}
            label={t.more.admin}
            description={t.more.adminBody}
            tone="neutral"
            href="/admin"
          />
        </ListGroup>

        <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-ink-400">
          {t.brand.name}
          <br />
          {t.brand.invocation}
        </p>
      </div>
    </>
  );
}
