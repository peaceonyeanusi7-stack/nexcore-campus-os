import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { PasswordField } from "@/components/auth/PasswordField";
import { AccountAvatar } from "@/components/dashboard/AccountAvatar";
import { Field, inputClass, PageTitle, Panel, Pill, btnGhost, btnPrimary } from "@/components/dashboard/kit";
import { useAuth } from "@/hooks/use-auth";
import {
  MIN_PASSWORD_LENGTH,
  passwordMeetsMinimum,
  profilePhotoObjectPath,
  validateProfilePhoto,
} from "@/lib/account";
import { ROLE_LABELS } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AccountPanelView = "profile" | "settings" | "password";
type StudentAccountDetails = Pick<
  Tables<"students">,
  "id" | "student_id" | "faculty" | "department" | "programme" | "level" | "status"
>;

export function ProfilePanel({
  onSaved,
  onNavigate,
  view = "profile",
}: {
  onSaved: () => void;
  onNavigate?: (view: AccountPanelView) => void;
  view?: AccountPanelView;
}) {
  const { userId, email, profile, role, refresh, signOut } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentAccountDetails | null>(null);
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setDepartment(profile?.department ?? "");
    setPhotoPath(profile?.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };
    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAccountCreatedAt(data.user?.created_at ?? null);
      setEmailVerified(Boolean(data.user?.email_confirmed_at));
    });
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (role !== "student" || !userId) {
      setStudent(null);
      return () => { active = false; };
    }
    void supabase
      .from("students")
      .select("id, student_id, faculty, department, programme, level, status")
      .eq("auth_user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setStudent(data);
      });
    return () => { active = false; };
  }, [role, userId]);

  async function reloadProfile() {
    await refresh();
    onSaved();
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!userId || !profile) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setSaved(false);

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim() || null;
    const changes = {
      full_name: cleanName,
      phone: cleanPhone,
      ...(role === "lecturer" ? { department: department.trim() || null } : {}),
    };
    const { error: profileError } = await supabase.from("profiles").update(changes).eq("id", userId);
    if (profileError) {
      setError("We couldn't save your profile changes. Please try again.");
      setBusy(false);
      return;
    }

    if (role === "student" && student) {
      const { error: studentError } = await supabase
        .from("students")
        .update({ full_name: cleanName, phone: cleanPhone })
        .eq("id", student.id);
      if (studentError) {
        await supabase.from("profiles").update({
          full_name: profile.full_name,
          phone: profile.phone,
        }).eq("id", userId);
        setError("Your campus record couldn't be updated. Please try again.");
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    setSaved(true);
    setNotice("Your profile was updated.");
    await reloadProfile();
  }

  async function savePhoto(file: File) {
    if (!userId) return;
    const validationMessage = validateProfilePhoto(file);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const path = profilePhotoObjectPath(userId, crypto.randomUUID(), file.type);
    if (!path) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }

    const oldPath = photoPath;
    setPhotoBusy(true);
    setError(null);
    setNotice(null);
    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
    if (uploadError) {
      setError("The photo couldn't be uploaded. Please try again.");
      setPhotoBusy(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
    if (profileError) {
      await supabase.storage.from("profile-photos").remove([path]);
      setError("The photo uploaded, but couldn't be saved to your profile.");
      setPhotoBusy(false);
      return;
    }

    if (role === "student" && student) {
      const { error: studentError } = await supabase.from("students").update({ profile_photo: path }).eq("id", student.id);
      if (studentError) {
        await supabase.from("profiles").update({ avatar_url: oldPath }).eq("id", userId);
        await supabase.storage.from("profile-photos").remove([path]);
        setError("The photo couldn't be connected to your campus record. Please try again.");
        setPhotoBusy(false);
        return;
      }
    }

    setPhotoPath(path);
    setPhotoBusy(false);
    setNotice("Your profile photo was updated.");
    await reloadProfile();
    if (oldPath && oldPath.startsWith(`${userId}/`) && oldPath !== path) {
      await supabase.storage.from("profile-photos").remove([oldPath]);
    }
  }

  async function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await savePhoto(file);
  }

  async function removePhoto() {
    if (!userId || !photoPath) return;
    if (!window.confirm("Remove your profile photo?")) return;
    const oldPath = photoPath;
    setPhotoBusy(true);
    setError(null);
    setNotice(null);
    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
    if (profileError) {
      setError("The photo couldn't be removed. Please try again.");
      setPhotoBusy(false);
      return;
    }
    if (role === "student" && student) {
      const { error: studentError } = await supabase.from("students").update({ profile_photo: null }).eq("id", student.id);
      if (studentError) {
        await supabase.from("profiles").update({ avatar_url: oldPath }).eq("id", userId);
        setError("The photo couldn't be removed from your campus record. Please try again.");
        setPhotoBusy(false);
        return;
      }
    }
    setPhotoPath(null);
    setPhotoBusy(false);
    setNotice("Your profile photo was removed.");
    await reloadProfile();
    if (oldPath.startsWith(`${userId}/`)) {
      const { error: removeError } = await supabase.storage.from("profile-photos").remove([oldPath]);
      if (removeError) setError("Your photo was removed from the profile, but its stored file couldn't be deleted.");
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!passwordMeetsMinimum(newPassword)) {
      setError(`Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (!email) {
      setError("Your account email couldn't be loaded. Please sign in again.");
      return;
    }

    setPasswordBusy(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setError("Your current password couldn't be confirmed. Check it and try again.");
      setPasswordBusy(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (updateError) {
      setError("Your password couldn't be changed. Check the requirements and try again.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNotice("Your password was changed.");
  }

  async function signOutEverywhere() {
    setError(null);
    const signOutError = await signOut();
    if (signOutError) setError("We couldn't sign you out. Please try again.");
  }

  if (view === "password") {
    return (
      <>
        <PageTitle title="Change password" subtitle="Confirm your current password before choosing a new one." />
        {error ? <p role="alert" className="mb-4 rounded-lg border border-flame/40 bg-flame-soft px-4 py-3 text-sm text-flame">{error}</p> : null}
        {notice ? <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald"><CheckCircle2 className="size-4" />{notice}</p> : null}
        <Panel title="Password">
          <form onSubmit={changePassword} className="max-w-xl space-y-4">
            <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
            <p className="-mt-2 text-xs text-ink-muted">Use at least {MIN_PASSWORD_LENGTH} characters.</p>
            <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={passwordBusy} className={btnPrimary}>
                {passwordBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Update password
              </button>
              <button type="button" className={btnGhost} onClick={() => onNavigate?.("settings")}>Back to account settings</button>
            </div>
          </form>
        </Panel>
      </>
    );
  }

  if (view === "settings") {
    return (
      <>
        <PageTitle title="Account settings" subtitle="Security and account details for your NexCore account." />
        {error ? <p role="alert" className="mb-4 rounded-lg border border-flame/40 bg-flame-soft px-4 py-3 text-sm text-flame">{error}</p> : null}
        {notice ? <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald"><CheckCircle2 className="size-4" />{notice}</p> : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Account">
            <dl className="divide-y divide-border text-sm">
              <AccountDetail label="Email address" value={email ?? "—"} />
              <AccountDetail label="Role" value={role ? ROLE_LABELS[role] : "—"} />
              <AccountDetail label="Institution" value={profile?.institution || "—"} />
              <AccountDetail label="Created" value={formatDate(accountCreatedAt)} />
              <AccountDetail label="Email verification" value={emailVerified ? "Verified" : "Not verified"} />
            </dl>
            {!emailVerified && email ? (
              <Link to="/verify-email" search={{ email, role: role ?? undefined }} className="mt-4 inline-flex text-sm font-medium text-brand hover:opacity-80">
                Resend verification email
              </Link>
            ) : null}
          </Panel>
          <Panel title="Account security">
            <p className="text-sm text-ink-muted">Password changes require your current password. Email changes are handled through verified account flows.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={btnGhost} onClick={() => onNavigate?.("password")}>Change password</button>
              <button type="button" disabled={busy} className={btnGhost} onClick={() => void signOutEverywhere()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Sign out of all sessions
              </button>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Profile" subtitle="Your personal and campus account details." />
      {error ? <p role="alert" className="mb-4 rounded-lg border border-flame/40 bg-flame-soft px-4 py-3 text-sm text-flame">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald/30 bg-emerald-soft px-4 py-3 text-sm text-emerald"><CheckCircle2 className="size-4" />{notice}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-4">
              <AccountAvatar name={profile?.full_name || fullName} photoPath={photoPath} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold">{profile?.full_name || fullName || "NexCore user"}</h2>
                <p className="truncate text-sm text-ink-muted">{email ?? "—"}</p>
                <span className="mt-2 inline-flex"><Pill>{role ? ROLE_LABELS[role] : "Account"}</Pill></span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Field label="Profile photo">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => void onPhotoChange(event)}
                  disabled={photoBusy}
                  className="block max-w-full text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink disabled:opacity-60"
                />
              </Field>
              {photoPath ? (
                <button type="button" disabled={photoBusy} className={btnGhost} onClick={() => void removePhoto()}>
                  {photoBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove
                </button>
              ) : null}
            </div>
            {photoBusy ? <p role="status" className="mt-3 flex items-center gap-2 text-xs text-ink-muted"><Upload className="size-3.5" /> Saving photo…</p> : null}
            <dl className="mt-5 divide-y divide-border text-sm">
              <AccountDetail label="School / Institution" value={profile?.institution || "—"} />
              <AccountDetail label="Email verification" value={emailVerified ? "Verified" : "Not verified"} />
              <AccountDetail label="Account created" value={formatDate(accountCreatedAt)} />
              {role === "student" ? <AccountDetail label="Student ID" value={student?.student_id ?? "—"} /> : null}
              {role === "student" ? <AccountDetail label="Faculty" value={student?.faculty ?? "—"} /> : null}
              {role === "student" ? <AccountDetail label="Department" value={student?.department ?? "—"} /> : null}
              {role === "student" ? <AccountDetail label="Programme" value={student?.programme ?? "—"} /> : null}
              {role === "student" ? <AccountDetail label="Level" value={student?.level ? `${student.level} level` : "—"} /> : null}
            </dl>
            <button type="button" className="mt-4 text-sm font-medium text-brand hover:opacity-80" onClick={() => onNavigate?.("settings")}>
              Account settings
            </button>
          </Panel>
        </div>

        <Panel title="Edit profile">
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input required className={inputClass} value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} />
            </Field>
            <Field label="Email address">
              <input className={inputClass} value={email ?? ""} readOnly />
            </Field>
            <Field label="Phone number">
              <input type="tel" autoComplete="tel" className={inputClass} value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false); }} />
            </Field>
            {role === "lecturer" ? (
              <Field label="Department">
                <input className={inputClass} value={department} onChange={(event) => { setDepartment(event.target.value); setSaved(false); }} />
              </Field>
            ) : null}
            {role === "student" ? (
              <Field label="Department (school record)">
                <input className={inputClass} value={student?.department ?? ""} readOnly />
              </Field>
            ) : null}
            <div className="flex items-end gap-3 sm:col-span-2">
              <button type="submit" disabled={busy || !profile} className={btnPrimary}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
              </button>
              {saved ? <span className="text-sm text-emerald">Saved</span> : null}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-medium">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}