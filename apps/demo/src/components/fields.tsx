import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/select";
import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

import type { Option } from "../lookup.ts";
import { useSession } from "../session.tsx";

export function Field({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={cn("grid min-w-0 gap-1.5", className)}>
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Choice<T extends string>({
  className,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly Option<T>[];
  value: T;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const hit = options.find(([v]) => v === next);
        if (hit) {
          onChange(hit[0]);
        }
      }}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, text]) => (
          <SelectItem key={v} value={v}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FailureText({ className, scope }: { className?: string; scope: string }) {
  const { failure } = useSession();
  if (failure?.scope !== scope) {
    return null;
  }
  return (
    <p role="alert" className={cn("text-xs text-error", className)}>
      {failure.message}
    </p>
  );
}
