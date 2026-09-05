import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-[var(--radius)] border border-border bg-paper px-3 py-2 text-sm text-fg outline-none ring-olive/30 placeholder:text-subtle focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
