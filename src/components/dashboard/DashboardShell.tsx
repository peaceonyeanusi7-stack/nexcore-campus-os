import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

export type DashboardSection = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export function DashboardShell({
  role,
  name,
  institution,
  sections,
  active,
  onSelect,
  onSignOut,
  children,
}: {
  role: AppRole;
  name: string;
  institution: string;
  sections: DashboardSection[];
  active: string;
  onSelect: (key: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "N";

  const nav = (
    <nav className="flex flex-col gap-1">
      {sections.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => {
            onSelect(s.key);
            setOpen(false);
          }}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
            active === s.key
              ? "gradient-brand text-brand-foreground shadow-brand"
              : "text-ink-muted hover:bg-muted hover:text-ink"
          }`}
        >
          <s.icon className="size-4 shrink-0" />
          {s.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={() => setOpen((v) => !v)}
              className="grid size-9 place-items-center rounded-md border border-border lg:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg gradient-brand text-brand-foreground shadow-brand">
                <span className="text-sm font-bold">N</span>
              </span>
              <span className="hidden sm:inline">NexCore</span>
            </Link>
            <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand sm:inline">
              {ROLE_LABELS[role]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{name || "NexCore user"}</p>
              <p className="text-xs text-ink-muted">{institution || "Institution not set"}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-emerald-soft text-xs font-semibold text-emerald">
              {initials}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="grid size-9 place-items-center rounded-md border border-border text-ink-muted hover:text-ink"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] gap-8 px-4 py-6 md:px-6">
        <aside className="sticky top-24 hidden h-fit w-60 shrink-0 rounded-2xl border border-border bg-surface-elevated p-3 lg:block">
          {nav}
        </aside>
        {open && (
          <div className="fixed inset-x-0 top-16 z-30 border-b border-border bg-background p-4 lg:hidden">{nav}</div>
        )}
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
