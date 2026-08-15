import type { ComponentProps, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardProps<T extends ElementType> = {
  as?: T;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, "as" | "className" | "children">;

export function Card<T extends ElementType = "div">({
  as,
  interactive = false,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      className={cn("card", interactive && "card-interactive", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink-900">
        {title}
      </h2>
      {action}
    </div>
  );
}
