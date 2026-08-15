import { cn } from "@/lib/utils";

/**
 * Minimal line-art Ganesha used as the committee's logo mark.
 * Drawn as strokes so it stays crisp at 20px in the header and 512px as the
 * PWA icon. `currentColor` lets it sit on saffron or on white.
 */
export function GaneshaMark({
  className,
  strokeWidth = 2.1,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* crown */}
        <path d="M24.8 16.6c0-6 3.2-10.6 7.2-10.6s7.2 4.6 7.2 10.6" />
        {/* head */}
        <path d="M19.8 23.6c1.4-5.6 6.2-9.6 12.2-9.6s10.8 4 12.2 9.6" />
        {/* ears */}
        <path d="M20.2 21.6c-6.6-2.2-11.4 1.8-11.4 8.2 0 5.6 3.6 9.4 7.8 9.4 2.6 0 4.4-1.5 5-3.6" />
        <path d="M43.8 21.6c6.6-2.2 11.4 1.8 11.4 8.2 0 5.6-3.6 9.4-7.8 9.4-2.6 0-4.4-1.5-5-3.6" />
        {/* eyes, lowered in meditation */}
        <path d="M24.6 26.4h5.4M34 26.4h5.4" />
        {/* trunk, curling to the devotee's left */}
        <path d="M32 28.2c0 6.4-.6 9.2-3.4 12.4-2.4 2.8-3.6 5.2-3.6 8 0 3.4 2.6 5.8 5.6 5.8 2.6 0 4.4-1.6 5-3.8" />
        {/* lotus base */}
        <path d="M14 55c4-3.6 10.6-5.6 18-5.6s14 2 18 5.6" opacity=".5" />
      </g>
      {/* crown finial + tilak */}
      <circle cx="32" cy="3.4" r="1.7" fill="currentColor" />
      <circle cx="32" cy="20.4" r="1.5" fill="currentColor" />
    </svg>
  );
}
