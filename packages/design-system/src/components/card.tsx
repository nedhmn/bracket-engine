import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils.ts";

const cardVariants = cva("rounded-lg p-4 transition-colors", {
  variants: {
    variant: {
      elevated: "border border-border bg-bg-elevated",
      outlined: "border border-border-bright bg-bg",
      plain: "border border-transparent bg-transparent",
    },
    interactive: {
      true: "cursor-pointer hover:bg-bg-hover",
      false: "",
    },
  },
  defaultVariants: {
    variant: "elevated",
    interactive: false,
  },
});

function Card({
  className,
  variant = "elevated",
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, interactive, className }))}
      {...props}
    />
  );
}

export { Card, cardVariants };
