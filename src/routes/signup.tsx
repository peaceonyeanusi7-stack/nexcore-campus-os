import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isAppRole, ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/roles";
import { btnPrimary, Field, inputClass } from "@/components/dashboard/kit";

type Search = { role?: string };

export const Route = createFileRoute("/signup")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    role: typeof search['role'] === "string" ? search['role'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create your account — NexCore Campus OS" },
      { name: "description", content: "Create a NexCore account as a student, lecturer or school administrator." },
      { property: "og:title", content: "Create your account — NexCore Campus OS" },
      { property: "og:description", content: "Join NexCore and run your campus on one platform." },
    ],
  }),
  component: SignupPage,
});

const roles: AppRole[] = ["student", "lecturer", "admin"];

function SignupPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/signup" });
  const [role, setRole] = useState<AppRole>(isAppRole(search.role) ? search.role : "student");
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName.trim(), institution: institution.trim(), role },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      navigate({ to: ROLE_HOME[role], replace: true });
      return;
    }
    setConfirmSent(true);
  }

  if (confirmSent) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-ink">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-soft text-emerald">
            <MailCheck className="size-6" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-ink-muted">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Confirm your
            address, then sign in to open your {ROLE_LABELS[role]} dashboard.
          </p>
          <Link to="/login" className={`${btnPrimary} mt-6`}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
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
            One account. Your whole campus.
          </h2>
          <p className="mt-4 max-w-md text-ink-muted">
            Register once and NexCore tailors your dashboard to your role — student, lecturer or
            school administrator.
          </p>
        </div>
        <p className="text-xs text-ink-muted">© {new Date().getFullYear()} NexCore EdTech</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-ink-muted">Takes less than a minute.</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-xl border px-2 py-3 text-[11px] font-medium transition-colors ${
                  role === r ? "border-brand bg-brand-soft text-brand" : "border-border text-ink-muted hover:border-brand"
                }`}
              >
                {ROLE_LABELS[r].split(" ")[0]}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Full name">
              <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Amara Okonkwo" />
            </Field>
            <Field label="School / Institution">
              <input required value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClass} placeholder="University of Lagos" />
            </Field>
            <Field label="Email address">
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@institution.edu.ng" />
            </Field>
            <Field label="Password">
              <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" />
            </Field>
            {error ? (
              <p role="alert" className="rounded-xl border border-flame/40 bg-flame-soft px-3 py-2 text-sm text-flame">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Create {ROLE_LABELS[role]} account
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-brand hover:opacity-80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
