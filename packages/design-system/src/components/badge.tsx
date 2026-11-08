import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border border-transparent pt-[2px] pb-[3px] pl-[7px] pr-[7px] text-xs tracking-[0.1px]",
  {
    variants: {
      tone: {
        neutral: "bg-bg-hover text-text-primary",
        accent: "bg-accent-bg text-accent",
        success: "bg-success-bg text-success",
        error: "bg-error-bg text-error",
        outline: "border-border-bright bg-transparent text-text-muted",
      },
      mono: {
        true: "font-code tracking-normal",
        false: "font-ui",
      },
    },
    defaultVariants: {
      tone: "neutral",
      mono: false,
    },
  },
);

function Badge({
  className,
  tone = "neutral",
  mono = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ tone, mono, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
