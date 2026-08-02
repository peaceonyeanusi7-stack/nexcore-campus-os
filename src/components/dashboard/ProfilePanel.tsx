import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageTitle, Panel, Field, inputClass, btnPrimary } from "@/components/dashboard/kit";

export function ProfilePanel({ onSaved }: { onSaved: () => void }) {
  const { profile, email } = useAuth();
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [matric, setMatric] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setInstitution(profile?.institution ?? "");
    setDepartment(profile?.department ?? "");
    setMatric(profile?.matric_number ?? "");
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    await supabase.from("profiles").update({
      full_name: fullName, institution, department, matric_number: matric || null,
    }).eq("id", profile.id);
    setBusy(false);
    setSaved(true);
    onSaved();
  }

  return (
    <>
      <PageTitle title="Profile" subtitle="Keep your campus record accurate." />
      <Panel>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Email"><input className={inputClass} value={email ?? ""} readOnly /></Field>
          <Field label="School / Institution"><input className={inputClass} value={institution} onChange={(e) => setInstitution(e.target.value)} /></Field>
          <Field label="Department"><input className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
          <Field label="Matric / Staff number"><input className={inputClass} value={matric} onChange={(e) => setMatric(e.target.value)} /></Field>
          <div className="flex items-end gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>Save changes</button>
            {saved ? <span className="text-sm text-emerald">Saved</span> : null}
          </div>
        </form>
      </Panel>
    </>
  );
}

