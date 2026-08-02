import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Presentation, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAppRole, ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { btnPrimary, Field, inputClass } from "@/components/dashboard/kit";

type Search = { role?: string };

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    role: typeof search['role'] === "string" ? search['role'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NexCore Campus OS" },
      { name: "description", content: "Sign in to your NexCore student, lecturer or administrator portal." },
      { property: "og:title", content: "Sign in — NexCore Campus OS" },
      { property: "og:description", content: "Access your NexCore campus dashboard." },
    ],
  }),
  component: LoginPage,
});

const portals: { role: AppRole; icon: typeof GraduationCap }[] = [
  { role: "student", icon: GraduationCap },
  { role: "lecturer", icon: Presentation },
  { role: "admin", icon: Building2 },
];

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const hint = isAppRole(search.role) ? search.role : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError || !data.user) {
      setError(signInError?.message ?? "Unable to sign in. Please try again.");
      setBusy(false);
      return;
    }
    const { data: row } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const role = isAppRole(row?.role) ? (row!.role as AppRole) : "student";
    navigate({ to: ROLE_HOME[role], replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background text-ink lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-surface p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg gradient-brand text-brand-foreground shadow-brand">
            <span className="text-sm font-bold">N</span>
          </span>
          NexCore
        </Link>
        <div>
          <h2 className="max-w-md font-display text-4xl font-semibold leading-tight tracking-tight">
            The Campus Operating System for African institutions.
          </h2>
          <p className="mt-4 max-w-md text-ink-muted">
            Attendance, academics, CBT exams, results and analytics — one secure login for students,
            lecturers and administrators.
          </p>
        </div>
        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} NexCore EdTech</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-lg font-semibold lg:hidden">
            <span className="grid size-8 place-items-center rounded-lg gradient-brand text-brand-foreground">
              <span className="text-sm font-bold">N</span>
            </span>
            NexCore
          </Link>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {hint ? `Signing in to the ${ROLE_LABELS[hint]} portal.` : "Sign in to your NexCore portal."}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {portals.map((p) => (
              <Link
                key={p.role}
                to="/login"
                search={{ role: p.role }}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors ${
                  hint === p.role ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-muted hover:border-brand"
                }`}
              >
                <p.icon className="size-4" />
                {ROLE_LABELS[p.role].split(" ")[0]}
              </Link>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email address">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@institution.edu.ng"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </Field>
            {error ? (
              <p role="alert" className="rounded-xl border border-flame/40 bg-flame-soft px-3 py-2 text-sm text-flame">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            New to NexCore?{" "}
            <Link to="/signup" className="font-medium text-brand hover:opacity-80">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
