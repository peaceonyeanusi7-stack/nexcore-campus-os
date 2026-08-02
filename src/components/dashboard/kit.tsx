import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface-elevated p-5">
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-display text-base font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-5">
      <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 font-display text-2xl font-semibold">{value}</p>
      <p className="text-sm text-ink-muted">{label}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">
      {message}
    </p>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-brand";

export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl gradient-brand px-5 text-sm font-medium text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60";

export const btnGhost =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-ink transition-colors hover:border-brand disabled:opacity-60";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{children}</div>;
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 bg-background px-4 py-3 text-sm">{children}</div>;
}

export function Pill({ tone = "muted", children }: { tone?: "muted" | "good" | "warn"; children: ReactNode }) {
  const tones = {
    muted: "bg-muted text-ink-muted",
    good: "bg-emerald-soft text-emerald",
    warn: "bg-flame-soft text-flame",
  } as const;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
