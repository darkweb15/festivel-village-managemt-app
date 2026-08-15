import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "saffron" | "gold" | "info" | "success" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  saffron: "bg-saffron-50 text-saffron-600",
  gold: "bg-gold-100 text-gold-700",
  info: "bg-info-50 text-info-700",
  success: "bg-success-50 text-success-700",
  danger: "bg-danger-50 text-danger-700",
  neutral: "bg-ink-100 text-ink-600",
};

type Props = {
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: Tone;
  href?: string;
  external?: boolean;
  trailing?: React.ReactNode;
  onClick?: () => void;
};

function Inner({ icon: Icon, label, description, tone = "neutral", trailing }: Props) {
  return (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[0.875rem]",
          TONES[tone],
        )}
      >
        <Icon className="size-[1.1rem]" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.9375rem] font-medium text-ink-900">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block truncate text-[0.75rem] text-ink-500">
            {description}
          </span>
        ) : null}
      </span>
      {trailing ?? (
        <ChevronRight
          className="size-[1.15rem] shrink-0 text-ink-300"
          strokeWidth={2}
          aria-hidden
        />
      )}
    </>
  );
}

const rowClass =
  "flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors " +
  "hover:bg-ink-50 active:bg-ink-100 focus-visible:bg-ink-50";

/** One row inside a grouped list card. */
export function ListRow(props: Props) {
  if (props.href && props.external) {
    // tel:/mailto: must stay in the same context — only web links get a new tab.
    const opensTab = /^https?:/i.test(props.href);
    return (
      <a
        href={props.href}
        {...(opensTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={rowClass}
      >
        <Inner {...props} />
      </a>
    );
  }

  if (props.href) {
    return (
      <Link href={props.href} className={rowClass}>
        <Inner {...props} />
      </Link>
    );
  }

  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className={rowClass}>
        <Inner {...props} />
      </button>
    );
  }

  // Informational row — nothing to activate, so it must not be a button.
  return (
    <div className="flex w-full items-center gap-3.5 px-4 py-3.5">
      <Inner {...props} />
    </div>
  );
}

/** Card that hairlines its children apart — the grouped-list container. */
export function ListGroup({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title ? (
        <h2 className="mb-2 px-1 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-400 uppercase">
          {title}
        </h2>
      ) : null}
      <div className="card divide-y divide-hairline overflow-hidden">{children}</div>
    </section>
  );
}
