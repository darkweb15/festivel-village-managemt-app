import type { ComponentProps, ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's only button.
 *
 * Every variant defines default / hover / active / focus / disabled, and the
 * component owns the loading and success states so no screen has to reinvent
 * "spinner inside a button". Feedback is a 2% scale press and an elevation
 * change — tactile without bouncing.
 */

type Variant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "destructive"
  | "icon";

type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "whitespace-nowrap select-none " +
  "transition-[transform,background-color,border-color,box-shadow,opacity] " +
  "duration-[--duration-fast] ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600";

const variants: Record<Variant, string> = {
  primary:
    "bg-saffron-600 text-white shadow-[0_6px_16px_-6px_rgba(234,83,8,0.5)] " +
    "hover:bg-saffron-700 hover:shadow-[0_10px_22px_-8px_rgba(234,83,8,0.55)] " +
    "active:bg-saffron-700 active:shadow-[0_3px_10px_-6px_rgba(234,83,8,0.5)]",
  secondary:
    "bg-white text-ink-800 border border-ink-200 " +
    "hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  tertiary:
    "bg-saffron-50 text-saffron-700 hover:bg-saffron-100 active:bg-saffron-200/70",
  ghost:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200/70",
  destructive:
    "bg-danger-500 text-white hover:bg-danger-700 active:bg-danger-700 " +
    "shadow-[0_6px_16px_-6px_rgba(240,68,56,0.45)]",
  icon: "text-ink-500 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200/70",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-5 text-sm",
  lg: "h-[3.25rem] px-6 text-[0.9375rem]",
};

const iconSizes: Record<Size, string> = {
  sm: "size-9 p-0",
  md: "size-11 p-0",
  lg: "size-[3.25rem] p-0",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    base,
    variants[variant],
    variant === "icon" ? iconSizes[size] : sizes[size],
    className,
  );
}

type ButtonProps = Omit<ComponentProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  /** Swaps the label for a spinner and blocks interaction. */
  loading?: boolean;
  /** Momentary confirmation — shows a tick in place of the label. */
  success?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  loading = false,
  success = false,
  loadingLabel,
  successLabel,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const busy = loading || success;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        buttonClasses(variant, size, className),
        success && "bg-success-500 text-white hover:bg-success-500",
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {loadingLabel ?? (typeof children === "string" ? children : "Working…")}
        </>
      ) : success ? (
        <>
          <Check className="size-4" strokeWidth={2.6} aria-hidden />
          {successLabel ?? "Done"}
        </>
      ) : (
        children
      )}
      {busy ? <span className="sr-only" aria-live="polite">
        {loading ? "Working" : "Done"}
      </span> : null}
    </button>
  );
}
