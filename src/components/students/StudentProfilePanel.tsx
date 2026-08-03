import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, Field, Rows, Row, Pill, inputClass, btnPrimary, Empty } from "@/components/dashboard/kit";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { STUDENT_LEVELS, statusTone, type Student } from "@/lib/students";

export function StudentProfilePanel({
  student,
  loading,
  onSaved,
}: {
  student: Student | null;
  loading: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    faculty: "",
    department: "",
    programme: "",
    level: "",
    profile_photo: "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!student) return;
    setForm({
      full_name: student.full_name ?? "",
      phone: student.phone ?? "",
      faculty: student.faculty ?? "",
      department: student.department ?? "",
      programme: student.programme ?? "",
      level: student.level ?? "",
      profile_photo: student.profile_photo ?? "",
    });
  }, [student]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from("students")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        faculty: form.faculty || null,
        department: form.department || null,
        programme: form.programme || null,
        level: form.level || null,
        profile_photo: form.profile_photo || null,
      })
      .eq("id", student.id);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
    onSaved();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-ink-muted">
        <Loader2 className="size-4 animate-spin" /> Loading your record…
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <PageTitle title="Student profile" />
        <Empty message="No student record is linked to this account yet. Ask your administrator to add you to the student register." />
      </>
    );
  }

  return (
    <>
      <PageTitle title="Student profile" subtitle="Your official campus record. Locked fields are managed by your school." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Panel>
          <div className="flex items-center gap-4">
            <StudentAvatar name={student.full_name} photo={form.profile_photo || student.profile_photo} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">{student.full_name || "Unnamed student"}</p>
              <p className="truncate text-sm text-ink-muted">{student.student_id}</p>
              <span className="mt-2 inline-block"><Pill tone={statusTone(student.status)}>{student.status}</Pill></span>
            </div>
          </div>
          <div className="mt-5">
            <Rows>
              <Row><span className="text-ink-muted">Email</span><span className="truncate">{student.email}</span></Row>
              <Row><span className="text-ink-muted">Phone</span><span>{student.phone || "—"}</span></Row>
              <Row><span className="text-ink-muted">Faculty</span><span>{student.faculty || "—"}</span></Row>
              <Row><span className="text-ink-muted">Department</span><span>{student.department || "—"}</span></Row>
              <Row><span className="text-ink-muted">Programme</span><span>{student.programme || "—"}</span></Row>
              <Row><span className="text-ink-muted">Level</span><span>{student.level ? `${student.level} level` : "—"}</span></Row>
            </Rows>
          </div>
        </Panel>

        <Panel title="Edit your details">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input required className={inputClass} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </Field>
            <Field label="Student ID (locked)">
              <input className={inputClass} value={student.student_id} readOnly />
            </Field>
            <Field label="Email (locked)">
              <input className={inputClass} value={student.email} readOnly />
            </Field>
            <Field label="Phone number">
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 800 000 0000" />
            </Field>
            <Field label="Faculty">
              <input className={inputClass} value={form.faculty} onChange={(e) => set("faculty", e.target.value)} placeholder="Science" />
            </Field>
            <Field label="Department">
              <input className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Computer Science" />
            </Field>
            <Field label="Programme">
              <input className={inputClass} value={form.programme} onChange={(e) => set("programme", e.target.value)} placeholder="B.Sc. Computer Science" />
            </Field>
            <Field label="Level">
              <select className={inputClass} value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="">Select level</option>
                {STUDENT_LEVELS.map((l) => <option key={l} value={l}>{l} level</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Profile photo URL">
                <input className={inputClass} value={form.profile_photo} onChange={(e) => set("profile_photo", e.target.value)} placeholder="https://…" />
              </Field>
            </div>
            <div className="flex items-end gap-3 sm:col-span-2">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Save changes
              </button>
              {saved ? <span className="text-sm text-emerald">Saved</span> : null}
              {error ? <span className="text-sm text-flame">{error}</span> : null}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}