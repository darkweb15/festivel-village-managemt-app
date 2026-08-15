import Link from "next/link";
import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { buttonClasses } from "@/components/ui/button";
import { APP } from "@/lib/constants";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-600 text-white">
          <GaneshaMark className="size-8" strokeWidth={2} />
        </span>

        <div className="mt-8 flex items-center justify-center gap-2 text-ink-400">
          <WifiOff className="size-4" strokeWidth={2} aria-hidden />
          <span className="text-[0.75rem] font-semibold tracking-[0.08em] uppercase">
            No connection
          </span>
        </div>

        <h1 className="mt-3 text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          You&rsquo;re offline
        </h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[0.875rem] leading-relaxed text-ink-500">
          Pages you&rsquo;ve already opened are still available. Reconnect to see
          the latest from the committee.
        </p>

        <Link href="/" className={buttonClasses("primary", "lg", "mt-7")}>
          Back to home
        </Link>

        <p className="mt-10 text-[0.6875rem] text-ink-300">{APP.name}</p>
      </div>
    </main>
  );
}
