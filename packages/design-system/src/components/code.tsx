import type * as React from "react";

import { cn } from "../lib/utils.ts";

function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn(
        "rounded-sm bg-code-bg pt-px pb-[2px] pl-[5px] pr-[5px] font-code text-sm text-code-text",
        className,
      )}
      {...props}
    />
  );
}

function CodeBlock({ className, children, ...props }: React.ComponentProps<"pre">) {
  return (
    <pre
      data-slot="code-block"
      className={cn(
        "m-0 overflow-x-auto rounded-md border border-border bg-code-bg p-[12px_14px] font-code text-sm text-code-text",
        className,
      )}
      {...props}
    >
      <code>{children}</code>
    </pre>
  );
}

export { Code, CodeBlock };
