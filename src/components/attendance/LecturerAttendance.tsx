import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCode as QrIcon, Users, CheckCircle2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { QrCode } from "@/components/attendance/QrCode";
import { downloadCsv } from "@/lib/courses";
import {
  ATTENDANCE_METHODS, ATTENDANCE_STATUSES, attendanceErrorMessage, attendedRate,
  methodLabel, newSessionCode, sessionIsOpen, statusTone, todayIso,
} from "@/lib/attendance";

export type LecturerAttendanceState = ReturnType<typeof useLecturerAttendance>;

export function useLecturerAttendance(lecturerId: string | null) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!lecturerId) return;
    setLoading(true);
    const { data: myCourses } = await supabase
      .from("courses").select("id, code, title").eq("lecturer_id", lecturerId).order("code");
    const ids = (myCourses ?? []).map((c: any) => c.id);
    const { data: ses } = await supabase
      .from("attendance_sessions")
      .select("id, title, session_code, held_on, start_time, end_time, method, status, expires_at, course_id, courses(code, title)")
      .eq("lecturer_id", lecturerId)
      .order("held_on", { ascending: false });
    const sessionIds = (ses ?? []).map((s: any) => s.id);
    const [recs, enr] = await Promise.all([
      sessionIds.length
        ? supabase.from("attendance_records")
            .select("id, session_id, student_id, status, verification_method, check_in_time, marked_at, profiles:student_id(full_name, email)")
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? supabase.from("enrollments").select("course_id, student_id, profiles:student_id(full_name, email)").in("course_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setCourses(myCourses ?? []);
    setSessions(ses ?? []);
    setRecords(recs.data ?? []);
    setRoster(enr.data ?? []);
    setLoading(false);
  }, [lecturerId]);

  useEffect(() => { void load(); }, [load]);

  const activeSessions = useMemo(() => sessions.filter((s) => sessionIsOpen(s)), [sessions]);
  const presentToday = useMemo(() => {
    const todaysIds = sessions.filter((s) => String(s.held_on).slice(0, 10) === todayIso()).map((s) => s.id);
    return records.filter((r) => todaysIds.includes(r.session_id) && r.status !== "absent").length;
  }, [sessions, records]);
  const rate = useMemo(() => attendedRate(records), [records]);

  return { loading, error, setError, courses, sessions, records, roster, activeSessions, presentToday, rate, reload: load };
}

export function LecturerAttendancePanel({ state, lecturerId }: { state: LecturerAttendanceState; lecturerId: string }) {
  const { courses, sessions, records, roster, activeSessions, presentToday, rate, reload, error, setError } = state;
  const [notice, setNotice] = useState<string | null>(null);

  function flash(text: string) {
    setNotice(text);
    setError(null);
    void reload();
  }

  return (
    <>
      <PageTitle title="Attendance" subtitle="Open a session, share the QR code, and manage check-ins in real time." />
      {notice ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-2.5 text-sm text-emerald">
          <CheckCircle2 className="size-4" /> {notice}
        </p>
      ) : null}
      {error ? <p className="mb-4 rounded-xl border border-flame/30 bg-flame-soft px-4 py-2.5 text-sm text-flame">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Radio} label="Active sessions" value={activeSessions.length} hint={`${sessions.length} total`} />
        <StatCard icon={Users} label="Present today" value={presentToday} />
        <StatCard icon={QrIcon} label="Check-ins recorded" value={records.length} />
        <StatCard icon={CheckCircle2} label="Attendance rate" value={`${rate}%`} hint="Present or late" />
      </div>

      <div className="mt-6">
        <Panel title="Create attendance session">
          <SessionForm courses={courses} lecturerId={lecturerId} onDone={() => flash("Attendance session created.")} onError={setError} />
        </Panel>
      </div>

      <div className="mt-6 space-y-4">
        {sessions.length ? sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            records={records.filter((r) => r.session_id === s.id)}
            roster={roster.filter((r) => r.course_id === s.course_id)}
            onChanged={flash}
            onError={setError}
          />
        )) : <Empty message="No attendance sessions yet. Create one above." />}
      </div>
    </>
  );
}

function SessionForm({ courses, lecturerId, onDone, onError }: any) {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [method, setMethod] = useState("qr");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const expires = new Date(`${date}T${end}:00`);
        const { error } = await supabase.from("attendance_sessions").insert({
          course_id: courseId,
          lecturer_id: lecturerId,
          title: title || "Class session",
          session_code: newSessionCode(),
          held_on: date,
          start_time: start,
          end_time: end,
          method,
          status: "open",
          expires_at: isNaN(expires.getTime()) ? null : expires.toISOString(),
        });
        setBusy(false);
        if (error) { onError(attendanceErrorMessage(error)); return; }
        setTitle("");
        onDone();
      }}
    >
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </Field>
      <Field label="Session title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 5 lecture" /></Field>
      <Field label="Attendance method">
        <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value)}>
          {ATTENDANCE_METHODS.map((m) => <option key={m.value} value={m.value} disabled={m.value === "gps"}>{m.label}</option>)}
        </select>
      </Field>
      <Field label="Date"><input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Start time"><input type="time" required className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="End time"><input type="time" required className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      <button type="submit" disabled={busy || !courseId} className={`${btnPrimary} sm:col-span-2 xl:col-span-1`}>Create session</button>
    </form>
  );
}

function SessionCard({ session, records, roster, onChanged, onError }: any) {
  const [showQr, setShowQr] = useState(false);
  const open = sessionIsOpen(session);
  const marked = new Set(records.map((r: any) => r.student_id));
  const missing = roster.filter((r: any) => !marked.has(r.student_id));

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("attendance_records").update({ status }).eq("id", id);
    if (error) { onError(attendanceErrorMessage(error)); return; }
    onChanged("Attendance updated.");
  }

  async function addManual(studentId: string, status: string) {
    const { error } = await supabase.from("attendance_records").insert({
      session_id: session.id, student_id: studentId, status, verification_method: "manual",
    });
    if (error) { onError(attendanceErrorMessage(error)); return; }
    onChanged("Attendance recorded.");
  }

  async function toggleOpen() {
    const { error } = await supabase.from("attendance_sessions")
      .update({ status: session.status === "open" ? "closed" : "open" }).eq("id", session.id);
    if (error) { onError(attendanceErrorMessage(error)); return; }
    onChanged(session.status === "open" ? "Session closed." : "Session reopened.");
  }

  return (
    <Panel
      title={`${session.courses?.code ?? "Course"} · ${session.title ?? "Class session"}`}
      action={
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={open ? "good" : "muted"}>{open ? "Open" : "Closed"}</Pill>
          <Pill>{methodLabel(session.method)}</Pill>
          <button type="button" className={btnGhost} onClick={() => setShowQr((v) => !v)}>{showQr ? "Hide QR" : "Show QR"}</button>
          <button type="button" className={btnGhost} onClick={() => void toggleOpen()}>{session.status === "open" ? "Close" : "Reopen"}</button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => downloadCsv(
              `attendance-${session.courses?.code ?? "course"}-${session.held_on}.csv`,
              [["Student", "Email", "Status", "Method", "Checked in"],
                ...records.map((r: any) => [
                  r.profiles?.full_name ?? "Student", r.profiles?.email ?? "",
                  r.status, methodLabel(r.verification_method),
                  new Date(r.check_in_time ?? r.marked_at).toLocaleString(),
                ])],
            )}
          >
            Export CSV
          </button>
        </span>
      }
    >
      <p className="mb-3 text-xs text-ink-muted">
        {new Date(session.held_on).toDateString()}
        {session.start_time ? ` · ${String(session.start_time).slice(0, 5)}–${String(session.end_time ?? "").slice(0, 5)}` : ""}
        {" · "}Code <span className="font-medium text-ink">{session.session_code}</span>
        {" · "}{records.length}/{roster.length} checked in
      </p>

      {showQr ? (
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-4">
          <QrCode value={session.session_code} />
          <div className="min-w-48 flex-1 text-sm text-ink-muted">
            <p className="font-display text-lg font-semibold text-ink">{session.session_code}</p>
            <p className="mt-1">Project this QR in class. Students scan it, or type the code, to check in.</p>
          </div>
        </div>
      ) : null}

      {records.length ? (
        <Rows>
          {records.map((r: any) => (
            <Row key={r.id}>
              <span>
                <span className="font-medium">{r.profiles?.full_name ?? "Student"}</span>
                <span className="block text-xs text-ink-muted">
                  {methodLabel(r.verification_method)} · {new Date(r.check_in_time ?? r.marked_at).toLocaleTimeString()}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                <select className={`${inputClass} h-9 w-28`} value={r.status} onChange={(e) => void setStatus(r.id, e.target.value)}>
                  {ATTENDANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </span>
            </Row>
          ))}
        </Rows>
      ) : <Empty message="No check-ins yet." />}

      {missing.length ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">Not yet marked ({missing.length})</p>
          <Rows>
            {missing.map((m: any) => (
              <Row key={m.student_id}>
                <span>{m.profiles?.full_name ?? "Student"}</span>
                <span className="flex items-center gap-2">
                  <button type="button" className={btnGhost} onClick={() => void addManual(m.student_id, "present")}>Present</button>
                  <button type="button" className={btnGhost} onClick={() => void addManual(m.student_id, "late")}>Late</button>
                  <button type="button" className={btnGhost} onClick={() => void addManual(m.student_id, "absent")}>Absent</button>
                </span>
              </Row>
            ))}
          </Rows>
        </div>
      ) : null}
    </Panel>
  );
}