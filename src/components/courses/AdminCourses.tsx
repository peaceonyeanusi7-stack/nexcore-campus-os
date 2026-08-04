import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, AlertTriangle, CheckCircle2, BookOpen, Users, CalendarClock, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { STUDENT_LEVELS } from "@/lib/students";
import { SEMESTERS, courseErrorMessage, periodState, type Course, type RegistrationPeriod } from "@/lib/courses";

type Lecturer = { id: string; full_name: string | null; email: string };

const emptyForm = {
  code: "", title: "", description: "", units: "3",
  semester: "First", level: "100", department: "", lecturer_id: "", status: "active",
};

export function useAdminCourses() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<{ id: string; course_id: string; student_id: string }[]>([]);
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [studentCount, setStudentCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, r, p, s] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("course_registrations").select("id, course_id, student_id"),
      supabase.from("registration_periods").select("*").order("closes_at", { ascending: false }),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);
    setCourses((c.data as Course[]) ?? []);
    setRegistrations(r.data ?? []);
    setPeriods((p.data as RegistrationPeriod[]) ?? []);
    setStudentCount(s.count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activePeriod = periods.find((p) => p.is_active) ?? null;
  return { loading, courses, registrations, periods, activePeriod, studentCount, reload: load };
}

export function AdminCoursesPanel({ state, lecturers }: { state: ReturnType<typeof useAdminCourses>; lecturers: Lecturer[] }) {
  const { loading, courses, registrations, periods, activePeriod, studentCount, reload } = state;
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const info = periodState(activePeriod);
  const registeredStudents = new Set(registrations.map((r) => r.student_id)).size;
  const progress = studentCount ? Math.min(100, Math.round((registeredStudents / studentCount) * 100)) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || (c.department ?? "").toLowerCase().includes(q));
  }, [courses, query]);

  function reset() { setForm({ ...emptyForm }); setEditing(null); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    const payload = {
      code: form.code.trim(), title: form.title.trim(), description: form.description.trim() || null,
      units: Number(form.units) || 0, semester: form.semester, level: form.level,
      department: form.department.trim() || null, lecturer_id: form.lecturer_id || null, status: form.status,
    };
    const { error: err } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing)
      : await supabase.from("courses").insert(payload);
    setBusy(false);
    if (err) { setError(courseErrorMessage(err)); return; }
    setNotice(editing ? "Course updated." : "Course created.");
    reset();
    await reload();
  }

  async function remove(course: Course) {
    setBusy(true); setError(null);
    const { error: err } = await supabase.from("courses").delete().eq("id", course.id);
    setBusy(false); setConfirmDelete(null);
    if (err) setError(courseErrorMessage(err)); else setNotice(`${course.code} deleted.`);
    await reload();
  }

  async function toggleStatus(course: Course) {
    await supabase.from("courses").update({ status: course.status === "active" ? "inactive" : "active" }).eq("id", course.id);
    setNotice(`${course.code} ${course.status === "active" ? "deactivated" : "activated"}.`);
    await reload();
  }

  async function assignLecturer(course: Course, lecturerId: string) {
    await supabase.from("courses").update({ lecturer_id: lecturerId || null }).eq("id", course.id);
    setNotice(`Lecturer updated for ${course.code}.`);
    await reload();
  }

  return (
    <>
      <PageTitle title="Courses & registration" subtitle="Create courses, assign lecturers and control the registration window." />

      {error ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-flame/30 bg-flame-soft px-4 py-2.5 text-sm text-flame">
          <AlertTriangle className="size-4" /> {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-2.5 text-sm text-emerald">
          <CheckCircle2 className="size-4" /> {notice}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={BookOpen} label="Total courses" value={courses.length} hint={`${courses.filter((c) => c.status === "active").length} active`} />
        <StatCard icon={Users} label="Total registrations" value={registrations.length} hint={`${registeredStudents} students`} />
        <StatCard icon={Percent} label="Registration progress" value={`${progress}%`} hint={`${studentCount} active students`} />
        <StatCard icon={CalendarClock} label="Registration period" value={info.open ? "Open" : "Closed"} hint={activePeriod ? `${activePeriod.session} · ${activePeriod.semester}` : "Not configured"} />
      </div>

      <div className="mt-6">
        <Panel title={editing ? "Edit course" : "Create course"} action={editing ? <button type="button" className={btnGhost} onClick={reset}>Cancel edit</button> : null}>
          <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <Field label="Course code"><input required className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSC 201" /></Field>
            <Field label="Course title"><input required className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Data Structures" /></Field>
            <Field label="Credit units"><input required type="number" min="0" className={inputClass} value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /></Field>
            <Field label="Department"><input className={inputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Computer Science" /></Field>
            <Field label="Level">
              <select className={inputClass} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {STUDENT_LEVELS.map((l) => <option key={l} value={l}>{l} level</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <select className={inputClass} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                {SEMESTERS.map((s) => <option key={s} value={s}>{s} semester</option>)}
              </select>
            </Field>
            <Field label="Lecturer">
              <select className={inputClass} value={form.lecturer_id} onChange={(e) => setForm({ ...form, lecturer_id: e.target.value })}>
                <option value="">Unassigned</option>
                {lecturers.map((l) => <option key={l.id} value={l.id}>{l.full_name ?? l.email}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="flex items-end sm:col-span-2 xl:col-span-1">
              <button type="submit" disabled={busy} className={btnPrimary}>{editing ? "Save changes" : "Create course"}</button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="mt-6">
        <RegistrationPeriods periods={periods} onChanged={async (m) => { setNotice(m); await reload(); }} />
      </div>

      <div className="mt-6">
        <Panel
          title={`${courses.length} courses`}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input className={`${inputClass} h-9 w-full pl-9 sm:w-64`} placeholder="Search code, title or department"
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading courses…</p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Title</th><th className="py-2 pr-3">Units</th>
                    <th className="py-2 pr-3">Level</th><th className="py-2 pr-3">Lecturer</th>
                    <th className="py-2 pr-3">Registered</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-3 font-medium">{c.code}</td>
                      <td className="py-3 pr-3">{c.title}<span className="block text-xs text-ink-muted">{c.department ?? "General"} · {c.semester ?? "—"} semester</span></td>
                      <td className="py-3 pr-3">{c.units}</td>
                      <td className="py-3 pr-3">{c.level ?? "—"}</td>
                      <td className="py-3 pr-3">
                        <select className={`${inputClass} h-9 w-40`} value={c.lecturer_id ?? ""} onChange={(e) => void assignLecturer(c, e.target.value)}>
                          <option value="">Unassigned</option>
                          {lecturers.map((l) => <option key={l.id} value={l.id}>{l.full_name ?? l.email}</option>)}
                        </select>
                      </td>
                      <td className="py-3 pr-3">{registrations.filter((r) => r.course_id === c.id).length}</td>
                      <td className="py-3 pr-3"><Pill tone={c.status === "active" ? "good" : "warn"}>{c.status}</Pill></td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" className={btnGhost} onClick={() => {
                            setEditing(c.id);
                            setForm({
                              code: c.code, title: c.title, description: c.description ?? "", units: String(c.units ?? 0),
                              semester: c.semester ?? "First", level: c.level ?? "100", department: c.department ?? "",
                              lecturer_id: c.lecturer_id ?? "", status: c.status ?? "active",
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}>Edit</button>
                          <button type="button" className={btnGhost} onClick={() => void toggleStatus(c)}>
                            {c.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button type="button" className={btnGhost} onClick={() => setConfirmDelete(c)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty message="No courses match your search." />}
        </Panel>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6">
            <h3 className="font-display text-lg font-semibold">Delete course?</h3>
            <p className="mt-2 text-sm text-ink-muted">
              {confirmDelete.code} — {confirmDelete.title}. This also removes its registrations. Consider deactivating instead.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => void remove(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function RegistrationPeriods({ periods, onChanged }: { periods: RegistrationPeriod[]; onChanged: (msg: string) => void | Promise<void> }) {
  const [session, setSession] = useState("");
  const [semester, setSemester] = useState("First");
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Panel title="Registration period">
      <form
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await supabase.from("registration_periods").update({ is_active: false }).eq("is_active", true);
          await supabase.from("registration_periods").insert({
            session, semester,
            opens_at: opens ? new Date(opens).toISOString() : new Date().toISOString(),
            closes_at: new Date(closes).toISOString(),
            is_active: true,
          });
          setBusy(false); setSession(""); setOpens(""); setCloses("");
          await onChanged("Registration period saved.");
        }}
      >
        <Field label="Session"><input required className={inputClass} value={session} onChange={(e) => setSession(e.target.value)} placeholder="2025/2026" /></Field>
        <Field label="Semester">
          <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map((s) => <option key={s} value={s}>{s} semester</option>)}
          </select>
        </Field>
        <Field label="Opens"><input type="datetime-local" className={inputClass} value={opens} onChange={(e) => setOpens(e.target.value)} /></Field>
        <Field label="Closes"><input required type="datetime-local" className={inputClass} value={closes} onChange={(e) => setCloses(e.target.value)} /></Field>
        <div className="flex items-end"><button type="submit" disabled={busy} className={btnPrimary}>Set period</button></div>
      </form>
      <div className="mt-4">
        {periods.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 pr-3">Session</th><th className="py-2 pr-3">Semester</th>
                  <th className="py-2 pr-3">Opens</th><th className="py-2 pr-3">Closes</th><th className="py-2 text-right">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.map((p) => {
                  const info = periodState(p);
                  return (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3 font-medium">{p.session}</td>
                      <td className="py-2.5 pr-3">{p.semester}</td>
                      <td className="py-2.5 pr-3">{new Date(p.opens_at).toLocaleDateString()}</td>
                      <td className="py-2.5 pr-3">{new Date(p.closes_at).toLocaleDateString()}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Pill tone={p.is_active && info.open ? "good" : "muted"}>{p.is_active ? (info.open ? "Open" : "Closed") : "Archived"}</Pill>
                          {p.is_active ? (
                            <button type="button" className={btnGhost} onClick={async () => {
                              await supabase.from("registration_periods").update({ is_active: false }).eq("id", p.id);
                              await onChanged("Registration period archived.");
                            }}>Archive</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty message="No registration period configured — students can register at any time." />}
      </div>
    </Panel>
  );
}