import Link from "next/link";
import { GaneshaMark } from "@/components/brand/ganesha-mark";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-8 text-center">
      <div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-saffron-600 text-white">
          <GaneshaMark className="size-8" strokeWidth={2} />
        </span>

        <p className="mt-8 text-[0.75rem] font-semibold tracking-[0.14em] text-saffron-600 uppercase">
          Page not found
        </p>
        <h1 className="mt-2 text-[1.375rem] font-bold tracking-[-0.03em] text-ink-900">
          This page doesn&rsquo;t exist
        </h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[0.875rem] leading-relaxed text-ink-500">
          It may have been moved, or the link might be out of date.
        </p>

        <Link href="/" className={buttonClasses("primary", "lg", "mt-7")}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
