import Image from "next/image";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import type { CommitteeMember } from "@/lib/supabase/types";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
  sizes = "48px",
}: {
  name: string;
  src?: string | null;
  className?: string;
  sizes?: string;
}) {
  return (
    <span
      className={cn(
        "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-saffron-50 text-saffron-700 ring-1 ring-hairline",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <span className="text-[0.8125rem] font-semibold" aria-hidden>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/**
 * Committee member row. Expands in place to reveal contact details — no route
 * change, so the list keeps its scroll position.
 */
export async function CommitteeMemberCard({ member }: { member: CommitteeMember }) {
  const t = await getDictionary();
  const hasDetail = Boolean(member.bio || member.phone || member.email);

  const summary = (
    <>
      <Avatar name={member.name} src={member.photo_url} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.9375rem] font-semibold text-ink-900">
          {member.name}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-500">
          {member.position}
        </span>
      </span>
    </>
  );

  if (!hasDetail) {
    return (
      <div className="card flex items-center gap-3.5 p-3.5">{summary}</div>
    );
  }

  return (
    <details className="card card-interactive group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3.5 p-3.5 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronRight
          className="size-[1.15rem] shrink-0 text-ink-400 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-90"
          strokeWidth={2}
          aria-hidden
        />
        <span className="sr-only">{t.common.showContact}</span>
      </summary>

      <div className="animate-fade border-t border-hairline px-3.5 pt-3.5 pb-4">
        {member.bio ? (
          <p className="text-[0.8125rem] leading-relaxed text-ink-600">
            {member.bio}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {member.phone ? (
            <a
              href={`tel:${member.phone}`}
              className="press inline-flex items-center gap-2 rounded-full bg-saffron-50 px-3.5 py-2 text-[0.8125rem] font-medium text-saffron-700"
            >
              <Phone className="size-3.5" strokeWidth={2.2} aria-hidden />
              {member.phone}
            </a>
          ) : null}
          {member.email ? (
            <a
              href={`mailto:${member.email}`}
              className="press inline-flex items-center gap-2 rounded-full bg-ink-100 px-3.5 py-2 text-[0.8125rem] font-medium text-ink-700"
            >
              <Mail className="size-3.5" strokeWidth={2.2} aria-hidden />
              {member.email}
            </a>
          ) : null}
        </div>
      </div>
    </details>
  );
}
