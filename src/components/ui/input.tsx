import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius)] border border-border bg-paper px-3 text-sm text-fg outline-none ring-olive/30 placeholder:text-subtle focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
