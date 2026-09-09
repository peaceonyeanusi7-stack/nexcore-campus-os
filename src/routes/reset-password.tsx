import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { btnGhost, btnPrimary, Field, inputClass } from "@/components/dashboard/kit";
import { PasswordField } from "@/components/auth/PasswordField";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — NexCore Campus OS" },
      { name: "description", content: "Request a secure NexCore password reset link or choose a new password." },
      { property: "og:title", content: "Reset password — NexCore Campus OS" },
      { property: "og:description", content: "Securely update your NexCore account password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashError = hash.get("error_description");
    if (hashError) setError("This password reset link is invalid or has expired. Request a new one below.");

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setRecoveryReady(hash.get("type") === "recovery" || Boolean(data.session));
      setChecking(false);
    };
    void checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setRecoveryReady(true);
        setChecking(false);
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  function validatePassword() {
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmation) return "Passwords do not match.";
    return null;
  }

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(false);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) {
      setError("We could not send the reset email. Check the address and try again shortly.");
      return;
    }
    setSent(true);
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError(updateError.message.includes("weak") || updateError.message.includes("breach")
        ? "Choose a stronger password that has not appeared in known data breaches."
        : "We could not update your password. Request a new reset link and try again.");
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <AuthPageShell>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-soft text-emerald"><CheckCircle2 className="size-7" /></div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-ink-muted">Your password has been changed securely. Sign in with your new password.</p>
        <button type="button" className={`${btnPrimary} mt-6 w-full`} onClick={() => navigate({ to: "/login", replace: true })}>Back to login</button>
      </AuthPageShell>
    );
  }

  if (recoveryReady) {
    return (
      <AuthPageShell>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><KeyRound className="size-7" /></div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm text-ink-muted">Use at least 6 characters. Avoid passwords that have appeared in known data breaches.</p>
        <form onSubmit={updatePassword} className="mt-6 space-y-4 text-left">
          <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="At least 6 characters" />
          <PasswordField label="Confirm new password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" placeholder="Enter it again" />
          {password.length > 0 ? <p className={`text-xs ${password.length >= 6 ? "text-emerald" : "text-flame"}`}>{password.length >= 6 ? "Password length requirement met." : "Password needs at least 6 characters."}</p> : null}
          {error ? <p role="alert" className="rounded-xl border border-flame/40 bg-flame-soft px-3 py-2 text-sm text-flame">{error}</p> : null}
          <button type="submit" disabled={busy || checking} className={`${btnPrimary} w-full`}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Update password</button>
        </form>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><KeyRound className="size-7" /></div>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-muted">Enter your account email and we’ll send you a secure reset link.</p>
      <form onSubmit={requestReset} className="mt-6 space-y-4 text-left">
        <Field label="Email address">
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@institution.edu.ng" />
        </Field>
        {sent ? <p role="status" className="rounded-xl border border-emerald/30 bg-emerald-soft px-3 py-2 text-sm text-emerald">Reset link sent. Check your inbox and spam/junk folder.</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-flame/40 bg-flame-soft px-3 py-2 text-sm text-flame">{error}</p> : null}
        <button type="submit" disabled={busy || checking} className={`${btnPrimary} w-full`}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Send reset link</button>
      </form>
      <Link to="/login" className={`${btnGhost} mt-4 w-full`}>Back to login</Link>
    </AuthPageShell>
  );
}

function AuthPageShell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-background px-6 py-12 text-ink"><main className="w-full max-w-md text-center">{children}</main></div>;
}