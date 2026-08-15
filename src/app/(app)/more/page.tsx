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
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { ShareAppRow } from "@/components/share-app-row";
import { AI, APP } from "@/lib/constants";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <>
      <header
        className="bg-white px-5 pb-6"
        style={{ paddingTop: "calc(var(--safe-top) + 1.75rem)" }}
      >
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-saffron-600 text-white shadow-[0_8px_20px_-8px_rgba(234,83,8,0.7)]">
            <GaneshaMark className="size-8" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[1.125rem] leading-tight font-bold tracking-[-0.025em] text-ink-900">
              {APP.name}
            </h1>
            <p className="mt-1 text-[0.8125rem] text-ink-500">{APP.festival}</p>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-6">
        <ListGroup title="Festival">
          <ListRow
            icon={Sparkles}
            label={`Ask ${AI.assistantShort}`}
            description="Answers from the committee's own data"
            tone="saffron"
            href="/assistant"
          />
          <ListRow
            icon={CalendarHeart}
            label="Book a Pooja"
            description="Couple pooja slots and availability"
            tone="gold"
            href="/book"
          />
          <ListRow
            icon={Radio}
            label="Live Darshan"
            description="Watch the mandapam live"
            tone="danger"
            href="/live"
          />
          <ListRow
            icon={CalendarClock}
            label="Pooja Timings"
            description="Daily schedule"
            tone="saffron"
            href="/pooja"
          />
          <ListRow
            icon={Info}
            label="Festival Information"
            description="About the celebration & nimajjanam"
            tone="gold"
            href="/festival"
          />
          <ListRow
            icon={Megaphone}
            label="Announcements"
            description="Latest committee updates"
            tone="info"
            href="/announcements"
          />
        </ListGroup>

        <ListGroup title="Community">
          <ListRow
            icon={Users}
            label="Our Committee"
            description="Who is organising the festival"
            tone="saffron"
            href="/committee"
          />
          <ListRow
            icon={HandHeart}
            label="Volunteers"
            description="The team on the ground"
            tone="success"
            href="/volunteers"
          />
          <ListRow
            icon={Handshake}
            label="Sponsors"
            description="Thank you to our supporters"
            tone="gold"
            href="/sponsors"
          />
        </ListGroup>

        <ListGroup title="Reach us">
          <ListRow
            icon={MapPin}
            label="Location & Directions"
            description="Find the mandapam"
            tone="info"
            href="/location"
          />
          <ListRow
            icon={Phone}
            label="Contact Us"
            description="Committee phone numbers"
            tone="neutral"
            href="/contact"
          />
        </ListGroup>

        <ListGroup title="App">
          <ListRow
            icon={Settings2}
            label="Settings"
            description="Install, about and version"
            tone="neutral"
            href="/settings"
          />
          <ShareAppRow />
          <ListRow
            icon={ShieldCheck}
            label="Committee Admin"
            description="Sign in to manage content"
            tone="neutral"
            href="/admin"
          />
        </ListGroup>

        <p className="px-1 text-center text-[0.6875rem] leading-relaxed text-ink-400">
          {APP.name}
          <br />
          {APP.invocation}
        </p>
      </div>
    </>
  );
}
