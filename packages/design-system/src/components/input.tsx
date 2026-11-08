import type * as React from "react";

import { cn } from "../lib/utils.ts";

const inputClasses =
  "w-full rounded-md border border-border bg-bg-elevated p-[9px_11px] font-ui text-sm text-text-primary outline-none transition-[border-color,box-shadow] focus:border-border-bright focus:ring-[3px] focus:ring-accent-bg disabled:opacity-40";

function Input({
  className,
  mono = false,
  ...props
}: React.ComponentProps<"input"> & { mono?: boolean }) {
  return (
    <input
      data-slot="input"
      className={cn(inputClasses, mono && "font-code", className)}
      {...props}
    />
  );
}

function Textarea({
  className,
  mono = false,
  ...props
}: React.ComponentProps<"textarea"> & { mono?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClasses, "resize-none", mono && "font-code", className)}
      {...props}
    />
  );
}

export { Input, Textarea };
