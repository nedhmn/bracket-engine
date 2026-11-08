import type * as React from "react";

import { cn } from "../lib/utils.ts";

function SectionHeading({
  className,
  eyebrow,
  title,
  lede,
  ...props
}: React.ComponentProps<"div"> & {
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    <div data-slot="section-heading" className={cn("grid gap-2.5", className)} {...props}>
      {eyebrow ? <p className="font-ui text-sm text-text-muted">{eyebrow}</p> : null}
      <h2 className="font-heading text-xl">{title}</h2>
      {lede ? (
        // Only the lede is serif, the marketing prose voice.
        <p className="max-w-[56ch] font-prose text-prose text-text-secondary">{lede}</p>
      ) : null}
    </div>
  );
}

export { SectionHeading };
