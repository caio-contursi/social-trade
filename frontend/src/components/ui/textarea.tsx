"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldError, useFieldIssue } from "./validated-form";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const issue = useFieldIssue(props.id || props.name);
  return (
    <>
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
      aria-invalid={issue ? true : props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], issue?.errorId].filter(Boolean).join(" ") || undefined}
    />
    <FieldError id={issue?.errorId}>{issue?.message}</FieldError>
    </>
  );
}

export { Textarea };
