import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QrCode as QrIcon, CalendarCheck, Percent, CheckCircle2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { attendanceErrorMessage, attendedRate, isSameDay, methodLabel, sessionIsOpen, statusTone, todayIso } from "@/lib/attendance";

export type StudentAttendanceState = ReturnType<typeof useStudentAttendance>;

export function useStudentAttendance(studentId: string | null) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const { data: enr } = await supabase
      .from("enrollments").select("course_id, courses(id, code, title)").eq("student_id", studentId);
    const ids = (enr ?? []).map((e: any) => e.course_id);
    const [recs, ses] = await Promise.all([
      supabase.from("attendance_records")
        .select("id, status, verification_method, check_in_time, marked_at, session_id, attendance_sessions(id, title, held_on, method, course_id, courses(code, title))")
        .eq("student_id", studentId)
        .order("check_in_time", { ascending: false }),
      ids.length
        ? supabase.from("attendance_sessions")
            .select("id, title, session_code, held_on, start_time, end_time, method, status, expires_at, course_id, courses(code, title)")
            .in("course_id", ids)
            .order("held_on", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setCourses((enr ?? []).map((e: any) => e.courses).filter(Boolean));
    setRecords(recs.data ?? []);
    setSessions(ses.data ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const markedSessionIds = useMemo(() => new Set(records.map((r) => r.session_id)), [records]);
  const activeSessions = useMemo(
    () => sessions.filter((s) => sessionIsOpen(s) && !markedSessionIds.has(s.id)),
    [sessions, markedSessionIds],
  );
  const rate = useMemo(() => attendedRate(records), [records]);
  const todayRecords = useMemo(
    () => records.filter((r) => isSameDay(r.check_in_time ?? r.marked_at)),
    [records],
  );
  const perCourse = useMemo(() => {
    return courses.map((c: any) => {
      const held = sessions.filter((s) => s.course_id === c.id);
      const mine = records.filter((r) => r.attendance_sessions?.course_id === c.id);
      const attended = mine.filter((r) => r.status === "present" || r.status === "late").length;
      return {
        id: c.id, code: c.code, title: c.title,
        held: held.length, attended,
        percent: held.length ? Math.round((attended / held.length) * 100) : 0,
      };
    });
  }, [courses, sessions, records]);

  return { loading, records, sessions, activeSessions, rate, todayRecords, perCourse, reload: load };
}

export function StudentAttendancePanel({ state, studentId }: { state: StudentAttendanceState; studentId: string }) {
  const { records, activeSessions, rate, todayRecords, perCourse, reload } = state;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  const checkIn = useCallback(async (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setError(null);
    const { data: session } = await supabase
      .from("attendance_sessions").select("id, status, held_on, expires_at, method").eq("session_code", value).maybeSingle();
    if (!session) {
      setError("No attendance session matches that code.");
      setBusy(false);
      return;
    }
    if (!sessionIsOpen(session)) {
      setError("That session is closed or outside its allowed time.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase.from("attendance_records").insert({
      session_id: session.id, student_id: studentId, status: "present",
      verification_method: session.method === "manual" ? "manual" : "qr",
    });
    setBusy(false);
    if (insertError) { setError(attendanceErrorMessage(insertError)); return; }
    setCode("");
    setNotice("Attendance marked. You're checked in.");
    void reload();
  }, [studentId, reload]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) { try { await scanner.stop(); scanner.clear(); } catch { /* already stopped */ } }
  }, []);

  async function startScanner() {
    setError(null);
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("nexcore-qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded: string) => {
          await stopScanner();
          await checkIn(decoded);
        },
        () => { /* ignore per-frame decode misses */ },
      );
    } catch {
      setError("Could not access the camera. Enter the session code instead.");
      await stopScanner();
    }
  }

  useEffect(() => () => { void stopScanner(); }, [stopScanner]);

  return (
    <>
      <PageTitle title="Attendance" subtitle="Scan the class QR code or enter the session code to check in." />
      {notice ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-2.5 text-sm text-emerald">
          <CheckCircle2 className="size-4" /> {notice}
        </p>
      ) : null}
      {error ? <p className="mb-4 rounded-xl border border-flame/30 bg-flame-soft px-4 py-2.5 text-sm text-flame">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Percent} label="Attendance rate" value={`${rate}%`} hint={`${records.length} check-ins`} />
        <StatCard icon={CalendarCheck} label="Today" value={todayRecords.length ? "Marked" : "Not marked"} hint={todayIso()} />
        <StatCard icon={QrIcon} label="Open sessions" value={activeSessions.length} hint="Awaiting your check-in" />
        <StatCard icon={CheckCircle2} label="Courses tracked" value={perCourse.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Mark attendance">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => { e.preventDefault(); void checkIn(code); }}
          >
            <div className="min-w-48 flex-1">
              <Field label="Session code">
                <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 4F9A2C" required />
              </Field>
            </div>
            <button type="submit" disabled={busy} className={btnPrimary}>Check in</button>
            <button type="button" className={btnGhost} onClick={() => (scanning ? void stopScanner() : void startScanner())}>
              <Camera className="size-4" /> {scanning ? "Stop scanner" : "Scan QR"}
            </button>
          </form>
          <div id="nexcore-qr-reader" className={`mt-4 overflow-hidden rounded-2xl ${scanning ? "border border-border" : "hidden"}`} />
        </Panel>

        <Panel title="Open sessions">
          {activeSessions.length ? (
            <Rows>
              {activeSessions.map((s: any) => (
                <Row key={s.id}>
                  <span>
                    <span className="font-medium">{s.courses?.code}</span> — {s.title ?? "Class session"}
                    <span className="block text-xs text-ink-muted">
                      {new Date(s.held_on).toDateString()}
                      {s.start_time ? ` · ${String(s.start_time).slice(0, 5)}–${String(s.end_time ?? "").slice(0, 5)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Pill>{methodLabel(s.method)}</Pill>
                    <button type="button" className={btnGhost} onClick={() => void checkIn(s.session_code)}>Check in</button>
                  </span>
                </Row>
              ))}
            </Rows>
          ) : <Empty message="No open sessions right now." />}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Attendance by course">
          {perCourse.length ? (
            <div className="space-y-3">
              {perCourse.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span><span className="font-medium">{c.code}</span> — {c.title}</span>
                    <span className="text-ink-muted">{c.attended}/{c.held} · {c.percent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full gradient-brand" style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty message="Register courses to start tracking attendance." />}
        </Panel>

        <Panel title="Attendance history">
          {records.length ? (
            <Rows>
              {records.map((r: any) => (
                <Row key={r.id}>
                  <span>
                    {r.attendance_sessions?.courses?.code ?? "Course"} · {r.attendance_sessions?.title ?? "Session"}
                    <span className="block text-xs text-ink-muted">
                      {new Date(r.check_in_time ?? r.marked_at).toLocaleString()} · {methodLabel(r.verification_method)}
                    </span>
                  </span>
                  <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                </Row>
              ))}
            </Rows>
          ) : <Empty message="No attendance records yet." />}
        </Panel>
      </div>
    </>
  );
}