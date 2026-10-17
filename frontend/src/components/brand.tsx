import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
export function Brand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sprout className="size-5" strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-[-.065em]">
          Social<span className="font-medium">Trade</span>
          <span className="text-primary">.</span>
        </span>
      )}
    </span>
  );
}
