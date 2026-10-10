import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  tone?: "primary" | "success" | "destructive" | "warning";
}) {
  const tones = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    success: "border-success/25 bg-success/5 text-success",
    destructive: "border-destructive/25 bg-destructive/5 text-destructive",
    warning: "border-warning/30 bg-warning/10 text-warning",
  } as const;
  return (
    <div className={`rounded-lg border px-5 py-4 ${tones[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
