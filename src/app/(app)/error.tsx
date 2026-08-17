"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Screen failed to render:", error);
  }, [error]);

  return (
    <div className="grid min-h-[70dvh] place-items-center px-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-danger-50 text-danger-500">
          <AlertTriangle className="size-5" strokeWidth={2} aria-hidden />
        </span>

        <h1 className="mt-5 text-[1.125rem] font-bold tracking-[-0.025em] text-ink-900">
          {t.appError.title}
        </h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[0.875rem] leading-relaxed text-ink-500">
          {t.appError.body}
        </p>

        <Button className="mt-6" onClick={reset}>
          {t.appError.retry}
        </Button>

        {error.digest ? (
          <p className="mt-6 font-mono text-[0.6875rem] text-ink-300">
            {t.appError.reference}: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
