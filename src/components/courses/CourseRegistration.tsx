import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Printer, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Pill, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { BookOpen, Layers, CalendarClock } from "lucide-react";
import type { Student } from "@/lib/students";
import {
  type Course, type CourseRegistration, type RegistrationPeriod,
  periodState, courseErrorMessage, printDocument,
} from "@/lib/courses";

export type RegistrationState = ReturnType<typeof useCourseRegistration>;

export function useCourseRegistration(studentId: string | null, student: Student | null) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [period, setPeriod] = useState<RegistrationPeriod | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const [c, r, p] = await Promise.all([
      supabase.from("courses").select("*").order("code"),
      supabase.from("course_registrations").select("*").eq("student_id", studentId),
      supabase.from("registration_periods").select("*").eq("is_active", true).order("closes_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setCourses((c.data as Course[]) ?? []);
    setRegistrations((r.data as CourseRegistration[]) ?? []);
    setPeriod((p.data as RegistrationPeriod | null) ?? null);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const state = periodState(period);
  const registeredIds = useMemo(() => registrations.map((r) => r.course_id), [registrations]);
  const myCourses = useMemo(
    () => courses.filter((c) => registeredIds.includes(c.id)),
    [courses, registeredIds],
  );
  const totalUnits = useMemo(() => myCourses.reduce((s, c) => s + Number(c.units ?? 0), 0), [myCourses]);

  const eligible = useMemo(
    () =>
      courses.filter((c) => {
        if (c.status !== "active") return false;
        if (c.department && student?.department && c.department.toLowerCase() !== student.department.toLowerCase()) return false;
        if (c.level && student?.level && c.level !== student.level) return false;
        return true;
      }),
    [courses, student],
  );

  return { loading, courses, registrations, period, periodInfo: state, registeredIds, myCourses, totalUnits, eligible, student, studentId, reload: load };
}

export function CourseRegistrationPanel({ reg }: { reg: RegistrationState }) {
  const { loading, myCourses, totalUnits, eligible, registeredIds, periodInfo, studentId, student, reload } = reg;
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ course: Course; action: "register" | "drop" } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [eligible, query]);

  async function apply(course: Course, action: "register" | "drop") {
    if (!studentId) return;
    setBusy(course.id); setError(null); setNotice(null);
    if (action === "register") {
      const { error: err } = await supabase.from("course_registrations").insert({
        student_id: studentId,
        course_id: course.id,
        session: periodInfo.period?.session ?? "",
        semester: periodInfo.period?.semester ?? course.semester ?? "",
      });
      if (err) setError(courseErrorMessage(err)); else setNotice(`Registered for ${course.code}.`);
    } else {
      const { error: err } = await supabase.from("course_registrations")
        .delete().eq("student_id", studentId).eq("course_id", course.id);
      if (err) setError(courseErrorMessage(err)); else setNotice(`${course.code} dropped.`);
    }
    setBusy(null); setConfirm(null);
    await reload();
  }

  function printSlip() {
    const rows = myCourses
      .map((c, i) => `<tr><td>${i + 1}</td><td>${c.code}</td><td>${c.title}</td><td>${c.units}</td><td>${c.semester ?? "—"}</td></tr>`)
      .join("");
    printDocument(
      "Course Registration Slip",
      `<div class="brand"><div><strong>NexCore Campus OS</strong><div class="muted">Course Registration Slip</div></div>
        <div class="muted">Generated ${new Date().toLocaleString()}</div></div>
      <div class="grid">
        <div><b>Name:</b> ${student?.full_name ?? "—"}</div>
        <div><b>Matric No:</b> ${student?.student_id ?? "—"}</div>
        <div><b>Department:</b> ${student?.department ?? "—"}</div>
        <div><b>Faculty:</b> ${student?.faculty ?? "—"}</div>
        <div><b>Level:</b> ${student?.level ?? "—"}</div>
        <div><b>Session:</b> ${periodInfo.period?.session ?? "—"} ${periodInfo.period?.semester ? `(${periodInfo.period.semester} semester)` : ""}</div>
      </div>
      <table><thead><tr><th>#</th><th>Code</th><th>Course title</th><th>Units</th><th>Semester</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">No courses registered.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3">Total credit units</td><td colspan="2">${totalUnits}</td></tr></tfoot></table>
      <div class="sign"><div>Student signature</div><div>Course adviser</div><div>HOD</div></div>`,
    );
  }

  return (
    <>
      <PageTitle
        title="Course registration"
        subtitle={periodInfo.label}
        action={
          <button type="button" className={btnGhost} onClick={printSlip} disabled={!myCourses.length}>
            <Printer className="size-4" /> Print slip (PDF)
          </button>
        }
      />

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={BookOpen} label="Registered courses" value={myCourses.length} />
        <StatCard icon={Layers} label="Total credit units" value={totalUnits} />
        <StatCard
          icon={CalendarClock}
          label="Registration window"
          value={periodInfo.open ? "Open" : "Closed"}
          hint={periodInfo.period ? `${periodInfo.period.session} · ${periodInfo.period.semester} semester` : "No period configured"}
        />
      </div>

      <div className="mt-6">
        <Panel
          title="Available courses"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                className={`${inputClass} h-9 w-full pl-9 sm:w-64`}
                placeholder="Search by code or title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading courses…</p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Units</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Semester</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => {
                    const isReg = registeredIds.includes(c.id);
                    return (
                      <tr key={c.id}>
                        <td className="py-3 pr-3 font-medium">{c.code}</td>
                        <td className="py-3 pr-3">{c.title}<span className="block text-xs text-ink-muted">{c.department ?? "General"}</span></td>
                        <td className="py-3 pr-3">{c.units}</td>
                        <td className="py-3 pr-3">{c.level ?? "—"}</td>
                        <td className="py-3 pr-3">{c.semester ?? "—"}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={busy === c.id || (!periodInfo.open && !isReg)}
                            onClick={() => setConfirm({ course: c, action: isReg ? "drop" : "register" })}
                          >
                            {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : isReg ? "Drop" : "Register"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty message={query ? "No courses match your search." : "No courses available for your department and level yet."} />
          )}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="My registered courses" action={<Pill tone="good">{totalUnits} credit units</Pill>}>
          {myCourses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Units</th><th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myCourses.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 pr-3 font-medium">{c.code}</td>
                      <td className="py-3 pr-3">{c.title}</td>
                      <td className="py-3 pr-3">{c.units}</td>
                      <td className="py-3 text-right">
                        <button type="button" className={btnGhost} disabled={!periodInfo.open} onClick={() => setConfirm({ course: c, action: "drop" })}>
                          Drop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty message="You have not registered any courses yet." />}
        </Panel>
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-elevated p-6">
            <h3 className="font-display text-lg font-semibold">
              {confirm.action === "register" ? "Register course?" : "Drop course?"}
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              {confirm.course.code} — {confirm.course.title} ({confirm.course.units} units)
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" className={btnGhost} onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className={btnPrimary} onClick={() => void apply(confirm.course, confirm.action)}>
                {confirm.action === "register" ? "Confirm registration" : "Yes, drop it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}