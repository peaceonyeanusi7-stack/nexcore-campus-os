import { useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, UserCheck, UserX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageTitle, Panel, StatCard, Empty, Field, Pill,
  inputClass, btnPrimary, btnGhost,
} from "@/components/dashboard/kit";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import { GraduationCap, UserCheck as UserCheckIcon, Clock } from "lucide-react";
import { STUDENT_LEVELS, statusTone, studentErrorMessage, type Student } from "@/lib/students";

const blank = {
  student_id: "", full_name: "", email: "", phone: "",
  faculty: "", department: "", programme: "", level: "", profile_photo: "", status: "active",
};

export function StudentManager({
  students,
  loading,
  onChanged,
}: {
  students: Student[];
  loading: boolean;
  onChanged: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [level, setLevel] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [showForm, setShowForm] = useState(false);

  const departments = useMemo(
    () => Array.from(new Set(students.map((s) => s.department).filter(Boolean) as string[])).sort(),
    [students],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (dept && s.department !== dept) return false;
      if (level && s.level !== level) return false;
      if (!q) return true;
      return [s.full_name, s.email, s.student_id, s.programme, s.department]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [students, query, dept, level]);

  const active = students.filter((s) => s.status === "active").length;
  const recent = useMemo(
    () => [...students].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [students],
  );

  async function setStatus(s: Student, status: string) {
    const { error } = await supabase.from("students").update({ status }).eq("id", s.id);
    onChanged(error ? studentErrorMessage(error) : `${s.full_name || s.student_id} is now ${status}.`);
  }

  async function remove(s: Student) {
    const { error } = await supabase.from("students").delete().eq("id", s.id);
    onChanged(error ? studentErrorMessage(error) : "Student record deleted.");
  }

  return (
    <>
      <PageTitle
        title="Manage students"
        subtitle="Add, update, search and deactivate students across your institution."
        action={
          <button type="button" className={btnPrimary} onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="size-4" /> Add student
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={GraduationCap} label="Total students" value={students.length} />
        <StatCard icon={UserCheckIcon} label="Active students" value={active} hint={`${students.length - active} inactive or graduated`} />
        <StatCard icon={Clock} label="Added this week" value={students.filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 864e5).length} />
      </div>

      {showForm || editing ? (
        <div className="mt-6">
          <StudentForm
            student={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={(m) => { setShowForm(false); setEditing(null); onChanged(m); }}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <Panel title={`${filtered.length} of ${students.length} students`}>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={`${inputClass} pl-9`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, student ID, email or programme"
                aria-label="Search students"
              />
            </div>
            <select className={`${inputClass} sm:w-48`} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className={`${inputClass} sm:w-40`} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level">
              <option value="">All levels</option>
              {STUDENT_LEVELS.map((l) => <option key={l} value={l}>{l} level</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading students…</div>
          ) : filtered.length ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/60 text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Student ID</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr key={s.id} className="bg-background align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <StudentAvatar name={s.full_name} photo={s.profile_photo} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{s.full_name || "Unnamed"}</span>
                            <span className="block truncate text-xs text-ink-muted">{s.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                      <td className="px-4 py-3">{s.department || "—"}<span className="block text-xs text-ink-muted">{s.programme || ""}</span></td>
                      <td className="px-4 py-3">{s.level || "—"}</td>
                      <td className="px-4 py-3"><Pill tone={statusTone(s.status)}>{s.status}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" className={btnGhost} onClick={() => { setShowForm(false); setEditing(s); }}>Edit</button>
                          {s.status === "active" ? (
                            <button type="button" className={btnGhost} onClick={() => void setStatus(s, "inactive")}>
                              <UserX className="size-4" /> Deactivate
                            </button>
                          ) : (
                            <button type="button" className={btnGhost} onClick={() => void setStatus(s, "active")}>
                              <UserCheck className="size-4" /> Activate
                            </button>
                          )}
                          <button
                            type="button"
                            className={btnGhost}
                            onClick={() => { if (confirm(`Delete ${s.full_name || s.student_id}? This cannot be undone.`)) void remove(s); }}
                          >
                            <Trash2 className="size-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message="No students match your search or filters." />
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Recently added">
          {recent.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                  <StudentAvatar name={s.full_name} photo={s.profile_photo} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{s.full_name || "Unnamed"}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {s.student_id} · {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : <Empty message="No students yet." />}
        </Panel>
      </div>
    </>
  );
}

function StudentForm({
  student,
  onSaved,
  onClose,
}: {
  student: Student | null;
  onSaved: (message: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(
    student
      ? {
          student_id: student.student_id,
          full_name: student.full_name ?? "",
          email: student.email,
          phone: student.phone ?? "",
          faculty: student.faculty ?? "",
          department: student.department ?? "",
          programme: student.programme ?? "",
          level: student.level ?? "",
          profile_photo: student.profile_photo ?? "",
          status: student.status,
        }
      : blank,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof blank, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      student_id: form.student_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      faculty: form.faculty.trim() || null,
      department: form.department.trim() || null,
      programme: form.programme.trim() || null,
      level: form.level || null,
      profile_photo: form.profile_photo.trim() || null,
      status: form.status,
    };
    const { error: err } = student
      ? await supabase.from("students").update(payload).eq("id", student.id)
      : await supabase.from("students").insert(payload);
    setBusy(false);
    if (err) {
      setError(studentErrorMessage(err));
      return;
    }
    onSaved(student ? "Student record updated." : "Student added.");
  }

  return (
    <Panel
      title={student ? `Edit ${student.full_name || student.student_id}` : "Add a new student"}
      action={<button type="button" className={btnGhost} onClick={onClose}><X className="size-4" /> Close</button>}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Student ID">
          <input required className={inputClass} value={form.student_id} onChange={(e) => set("student_id", e.target.value)} placeholder="NC/2026/0001" />
        </Field>
        <Field label="Full name">
          <input required className={inputClass} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field label="Email">
          <input required type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Phone number">
          <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234 800 000 0000" />
        </Field>
        <Field label="Faculty">
          <input className={inputClass} value={form.faculty} onChange={(e) => set("faculty", e.target.value)} />
        </Field>
        <Field label="Department">
          <input className={inputClass} value={form.department} onChange={(e) => set("department", e.target.value)} />
        </Field>
        <Field label="Programme">
          <input className={inputClass} value={form.programme} onChange={(e) => set("programme", e.target.value)} />
        </Field>
        <Field label="Level">
          <select className={inputClass} value={form.level} onChange={(e) => set("level", e.target.value)}>
            <option value="">Select level</option>
            {STUDENT_LEVELS.map((l) => <option key={l} value={l}>{l} level</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="graduated">Graduated</option>
          </select>
        </Field>
        <div className="sm:col-span-2 xl:col-span-3">
          <Field label="Profile photo URL">
            <input className={inputClass} value={form.profile_photo} onChange={(e) => set("profile_photo", e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2 xl:col-span-3">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} {student ? "Save changes" : "Add student"}
          </button>
          {error ? <span className="text-sm text-flame">{error}</span> : null}
        </div>
      </form>
    </Panel>
  );
}