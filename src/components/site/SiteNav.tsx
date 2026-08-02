import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/features", label: "Features" },
  { to: "/solutions", label: "Solutions" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg gradient-brand text-brand-foreground shadow-brand">
            <span className="text-sm font-bold">N</span>
          </span>
          <span>NexCore</span>
          <span className="ml-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-emerald">
            EdTech
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
              activeProps={{ className: "text-ink font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm text-ink-muted hover:text-ink">
            Sign in
          </Link>
          <Link
            to="/demo"
            className="inline-flex h-9 items-center rounded-full gradient-brand px-4 text-sm font-medium text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5"
          >
            Request a demo
          </Link>
        </div>
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-md border border-border md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-ink-muted hover:bg-muted hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/demo"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-full gradient-brand px-4 text-sm font-medium text-brand-foreground"
            >
              Request a demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
