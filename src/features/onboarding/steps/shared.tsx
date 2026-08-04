import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl text-foreground sm:text-4xl">{title}</h2>
      {description && <p className="mt-2 text-muted-foreground">{description}</p>}
    </div>
  );
}

export function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-organic hover:shadow-soft",
        selected
          ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
    </button>
  );
}
