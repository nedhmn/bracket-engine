import { cn } from "@repo/design-system/lib/utils";

type Choice<T> = {
  disabled?: boolean;
  label: string;
  value: T;
};

export function Segmented<T extends string | number>({
  className,
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: T) => void;
  options: readonly Choice<T>[];
  value: T | null;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-pill bg-bg-hover p-1",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className="inline-flex cursor-pointer items-center justify-center rounded-pill px-3 py-1 font-ui text-sm whitespace-nowrap text-text-secondary tabular-nums transition-colors outline-none hover:text-text-primary focus-visible:ring-[3px] focus-visible:ring-accent-bg-strong disabled:pointer-events-none disabled:opacity-40 aria-checked:bg-bg-elevated aria-checked:text-text-primary"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
