"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setFailed(false);
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      setFailed(true);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "press inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[0.75rem] font-semibold text-ink-700 transition-colors hover:bg-ink-200",
        copied && "bg-success-50 text-success-700",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
      ) : (
        <Copy className="size-3.5" strokeWidth={2.2} aria-hidden />
      )}
      <span aria-live="polite">
        {copied ? t.common.copied : failed ? t.common.selectManually : label}
      </span>
    </button>
  );
}
