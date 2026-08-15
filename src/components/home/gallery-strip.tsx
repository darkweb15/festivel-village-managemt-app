import Image from "next/image";
import Link from "next/link";
import type { GalleryItem } from "@/lib/supabase/types";

/**
 * Horizontally scrolling memories strip.
 *
 * A scroller rather than a grid so Home stays short: the whole gallery is one
 * tap away and this only has to invite the tap.
 */
export function GalleryStrip({ items }: { items: GalleryItem[] }) {
  return (
    <div className="scroll-x -mx-5 flex gap-3 px-5 pb-1">
      {items.map((item, index) => (
        <Link
          key={item.id}
          href="/gallery"
          className="press group relative aspect-[3/4] w-32 shrink-0 scroll-ml-5 overflow-hidden rounded-tile bg-ink-100 ring-1 ring-hairline"
          style={{ scrollSnapAlign: "start" }}
        >
          <Image
            src={item.thumbnail_url ?? item.url}
            alt={item.title ?? item.caption ?? ""}
            fill
            sizes="128px"
            // Only the first couple are likely above the fold on a phone.
            loading={index < 2 ? "eager" : "lazy"}
            className="object-cover transition-transform duration-[--duration-slow] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
          />
          {item.title ? (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-900/75 to-transparent px-2.5 pt-8 pb-2">
              <span className="t-caption line-clamp-2 font-medium text-white">
                {item.title}
              </span>
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
