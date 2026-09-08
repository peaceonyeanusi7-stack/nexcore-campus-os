import { Link } from "@tanstack/react-router";

const cols = [
  {
    title: "Product",
    links: [
      { to: "/features", label: "Features" },
      { to: "/solutions", label: "Solutions" },
      { to: "/signup", label: "Get started" },
      { to: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/contact", label: "Contact" },
      { to: "/about", label: "Careers" },
      { to: "/about", label: "Newsroom" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/features", label: "Guides" },
      { to: "/features", label: "Case studies" },
      { to: "/features", label: "Help center" },
      { to: "/features", label: "Blog" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <span className="grid size-8 place-items-center rounded-lg gradient-brand text-brand-foreground shadow-brand">
                <span className="text-sm font-bold">N</span>
              </span>
              NexCore
            </div>
            <p className="mt-4 max-w-sm text-sm text-ink-muted">
              The Campus Operating System purpose-built for African higher institutions.
              Attendance, academics, communication and analytics — unified.
            </p>
            <form className="mt-6 flex max-w-sm gap-2">
              <input
                type="email"
                placeholder="Work email"
                className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none placeholder:text-ink-muted focus:border-brand"
              />
              <button className="inline-flex h-10 items-center rounded-full gradient-brand px-4 text-sm font-medium text-brand-foreground">
                Subscribe
              </button>
            </form>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l, i) => (
                  <li key={i}>
                    <Link to={l.to} className="text-sm text-ink hover:text-brand">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-ink-muted md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} NexCore EdTech. Building Africa's Smart Campuses.</p>
          <div className="flex gap-6">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
