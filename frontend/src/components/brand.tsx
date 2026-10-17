import { cn } from "@/lib/utils";

/** Símbolo da marca: uma ponte ligando dois pontos (quem apoia e quem transforma). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={cn("size-9 shrink-0", className)}
    >
      <rect width="36" height="36" rx="11" className="fill-primary" />
      <path
        d="M9 24.5c2.4-8.6 15.6-8.6 18 0"
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <circle cx="9" cy="24.5" r="3" className="fill-energy" />
      <circle cx="27" cy="24.5" r="3" className="fill-energy" />
    </svg>
  );
}

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
      <BrandMark />
      {!compact && (
        <span className="font-display text-[1.4rem] leading-none font-semibold tracking-[-0.02em]">
          Social<span className="font-medium italic">Trade</span>
          <span className="text-energy">.</span>
        </span>
      )}
    </span>
  );
}
