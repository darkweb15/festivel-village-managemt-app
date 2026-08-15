import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The committee's full emblem, as painted artwork.
 *
 * Its own artwork carries the committee name, the village and the year, so it
 * only works at size — roughly 96px and up. Anywhere smaller, and in every
 * navigation or header slot, use `GaneshaMark` instead: that one is line art in
 * `currentColor` and is drawn to survive being 16px wide.
 *
 * Displayed between 96px and 144px, and deliberately given no `sizes`: that
 * attribute describes a layout width, which lets the browser satisfy a 128px
 * box with a cached 128px file and hand a 2x phone a soft logo. Without it Next
 * emits 1x/2x density descriptors from `width` below, so the emblem decodes at
 * 288px or 576px and stays sharp at every size it is used at.
 */
export function CommitteeEmblem({
  className,
  priority = false,
  alt = "",
}: {
  className?: string;
  priority?: boolean;
  /** Left empty where adjacent text already names the committee. */
  alt?: string;
}) {
  return (
    <Image
      src="/brand/logo.png"
      width={288}
      height={288}
      priority={priority}
      alt={alt}
      aria-hidden={alt === "" ? true : undefined}
      className={cn("h-auto w-36 select-none", className)}
    />
  );
}
