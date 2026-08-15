"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-white px-8 text-center">
        <div>
          <h1 className="text-[1.25rem] font-bold tracking-[-0.03em] text-ink-900">
            The app couldn&rsquo;t start
          </h1>
          <p className="mx-auto mt-2 max-w-[20rem] text-[0.875rem] leading-relaxed text-ink-500">
            Please reload the page. If it keeps happening, contact the committee.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-full bg-saffron-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Reload
          </button>
          {error.digest ? (
            <p className="mt-6 font-mono text-[0.6875rem] text-ink-300">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
