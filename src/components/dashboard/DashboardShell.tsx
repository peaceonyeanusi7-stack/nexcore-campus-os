import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, KeyRound, Menu, Settings, UserRound, X, type LucideIcon } from "lucide-react";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";
import { AccountAvatar } from "@/components/dashboard/AccountAvatar";

export type DashboardSection = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export function DashboardShell({
  role,
  name,
  institution,
  photoPath,
  sections,
  active,
  onSelect,
  onSignOut,
  children,
}: {
  role: AppRole;
  name: string;
  institution: string;
  photoPath?: string | null;
  sections: DashboardSection[];
  active: string;
  onSelect: (key: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((current) => !current)}
                className="flex h-10 items-center gap-2 rounded-lg border border-border px-1.5 text-ink-muted hover:text-ink"
                aria-label="Open account menu"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
              >
                <AccountAvatar name={name || initials} photoPath={photoPath} size="sm" />
                <ChevronDown className="mr-1 size-4" />
              </button>
              {accountMenuOpen ? (
                <div role="menu" className="absolute right-0 top-12 z-50 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onSelect("profile"); setAccountMenuOpen(false); }}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-muted"
                  >
                    <UserRound className="size-4" /> Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onSelect("account-settings"); setAccountMenuOpen(false); }}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-muted"
                  >
                    <Settings className="size-4" /> Account Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onSelect("change-password"); setAccountMenuOpen(false); }}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-muted"
                  >
                    <KeyRound className="size-4" /> Change Password
                  </button>
                  <div className="my-1 border-t border-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setAccountMenuOpen(false); void onSignOut(); }}
                    className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-flame hover:bg-flame-soft"
                  >
                    <UserRound className="size-4" /> Log out
                  </button>
                </div>
              ) : null}
            </div>
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
