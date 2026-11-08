import { Select as SelectPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "../lib/utils.ts";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated p-[9px_11px] font-ui text-sm whitespace-nowrap text-text-primary outline-none transition-[border-color,box-shadow] focus-visible:border-border-bright focus-visible:ring-[3px] focus-visible:ring-accent-bg disabled:cursor-not-allowed disabled:opacity-40 data-placeholder:text-text-muted",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 text-text-muted">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-100 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border border-border bg-bg-elevated shadow-popover",
          position === "popper" && "w-full min-w-(--radix-select-trigger-width) translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 font-ui text-sm text-text-primary outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-bg-hover",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
