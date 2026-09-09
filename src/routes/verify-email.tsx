import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { btnGhost, btnPrimary } from "@/components/dashboard/kit";
import { isAppRole, ROLE_HOME, ROLE_LABELS, type AppRole } from "@/lib/roles";

type Search = { email?: string; role?: string };

export const Route = createFileRoute("/verify-email")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): Search => ({
    email: typeof search["email"] === "string" ? search["email"] : undefined,
    role: typeof search["role"] === "string" ? search["role"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify your email — NexCore Campus OS" },
      { name: "description", content: "Confirm your email address to access your NexCore campus portal." },
      { property: "og:title", content: "Verify your email — NexCore Campus OS" },
      { property: "og:description", content: "Confirm your email address to access your NexCore campus portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyEmailPage,
});

const COOLDOWN_SECONDS = 60;

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/verify-email" });
  const email = search.email?.trim() ?? "";
  const role: AppRole = isAppRole(search.role) ? search.role : "student";
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (data.user?.email_confirmed_at) setVerified(true);
      setChecking(false);
    };
    void check();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user.email_confirmed_at) {
        setVerified(true);
      }
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function resend(event?: FormEvent) {
    event?.preventDefault();
    if (!email || cooldown > 0 || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setBusy(false);
    if (resendError) {
      setError(resendError.message.includes("rate")
        ? "Please wait a moment before requesting another email."
        : "We could not send the verification email. Please try again shortly.");
      return;
    }
    setCooldown(COOLDOWN_SECONDS);
    setMessage("Verification email sent. Please check your inbox and spam/junk folder.");
  }

  async function checkStatus() {
    setChecking(true);
    setError(null);
    const { data, error: userError } = await supabase.auth.getUser();
    setChecking(false);
    if (userError) {
      setError("We could not check your verification status. Open the verification link first, then try again.");
      return;
    }
    if (data.user?.email_confirmed_at) {
      setVerified(true);
      return;
    }
    setMessage("Your email is not verified yet. Open the latest email we sent, then check again.");
  }

  if (verified) {
    return (
      <AuthPageShell>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-soft text-emerald">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Email verified</h1>
        <p className="mt-2 text-sm text-ink-muted">Your email is confirmed. You can now sign in to your {ROLE_LABELS[role]} portal.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/login" className={btnPrimary}>Back to login</Link>
          <button type="button" className={btnGhost} onClick={() => navigate({ to: ROLE_HOME[role] })}>Open dashboard</button>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <MailCheck className="size-7" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Check your email</h1>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        We sent a verification link to <span className="font-medium text-ink">{email || "your email address"}</span>.
        Confirm it to activate your account.
      </p>
      <p className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-ink-muted">
        Verification email sent. Please check your inbox and spam/junk folder.
      </p>
      {message ? <p role="status" className="mt-4 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-3 text-left text-sm text-emerald">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-xl border border-flame/40 bg-flame-soft px-4 py-3 text-left text-sm text-flame">{error}</p> : null}
      <div className="mt-6 space-y-3">
        <button type="button" disabled={!email || cooldown > 0 || busy} onClick={() => void resend()} className={`${btnPrimary} w-full`}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
        </button>
        <button type="button" disabled={checking} onClick={() => void checkStatus()} className={`${btnGhost} w-full`}>
          {checking ? <Loader2 className="size-4 animate-spin" /> : null}
          I’ve verified my email / Check status
        </button>
      </div>
      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand hover:opacity-80">Back to login</Link>
    </AuthPageShell>
  );
}

function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12 text-ink">
      <main className="w-full max-w-md text-center">{children}</main>
    </div>
  );
}