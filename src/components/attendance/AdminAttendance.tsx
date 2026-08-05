import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Percent, CalendarCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnGhost } from "@/components/dashboard/kit";
import { downloadCsv, printDocument } from "@/lib/courses";
import { attendedRate, isSameDay, methodLabel, reportTableHtml, statusTone } from "@/lib/attendance";

export type AdminAttendanceState = ReturnType<typeof useAdminAttendance>;

export function useAdminAttendance() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ses, recs, lec] = await Promise.all([
      supabase.from("attendance_sessions")
        .select("id, title, session_code, held_on, start_time, end_time, method, status, lecturer_id, course_id, courses(code, title, department, semester, level)")
        .order("held_on", { ascending: false }),
      supabase.from("attendance_records")
        .select("id, session_id, student_id, status, verification_method, check_in_time, marked_at, profiles:student_id(full_name, email)"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setSessions(ses.data ?? []);
    setRecords(recs.data ?? []);
    setLecturers(lec.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { loading, sessions, records, lecturers, reload: load };
}

export function AdminAttendancePanel({ state }: { state: AdminAttendanceState }) {
  const { sessions, records, lecturers } = state;
  const [department, setDepartment] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const departments = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.courses?.department).filter(Boolean))).sort(),
    [sessions],
  );
  const courseOptions = useMemo(
    () => Array.from(new Map(sessions.filter((s) => s.courses).map((s) => [s.course_id, s.courses])).entries()),
    [sessions],
  );
  const nameOf = useCallback((id: string | null) => lecturers.find((l) => l.id === id)?.full_name ?? "—", [lecturers]);

  const filteredSessions = useMemo(() => sessions.filter((s) => {
    if (department && s.courses?.department !== department) return false;
    if (lecturer && s.lecturer_id !== lecturer) return false;
    if (course && s.course_id !== course) return false;
    if (semester && s.courses?.semester !== semester) return false;
    if (date && String(s.held_on).slice(0, 10) !== date) return false;
    return true;
  }), [sessions, department, lecturer, course, semester, date]);

  const sessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);
  const filteredRecords = useMemo(() => records.filter((r) => {
    if (!sessionIds.has(r.session_id)) return false;
    if (search && !`${r.profiles?.full_name ?? ""} ${r.profiles?.email ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [records, sessionIds, search]);

  const rate = attendedRate(filteredRecords);
  const todayCount = filteredRecords.filter((r) => isSameDay(r.check_in_time ?? r.marked_at)).length;

  const byDepartment = useMemo(() => {
    const map = new Map<string, { total: number; attended: number }>();
    for (const r of filteredRecords) {
      const s = filteredSessions.find((x) => x.id === r.session_id);
      const dep = s?.courses?.department || "Unassigned";
      const cur = map.get(dep) ?? { total: 0, attended: 0 };
      cur.total += 1;
      if (r.status !== "absent") cur.attended += 1;
      map.set(dep, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v, percent: v.total ? Math.round((v.attended / v.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [filteredRecords, filteredSessions]);

  const dailyOverview = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filteredRecords) {
      const day = String(r.check_in_time ?? r.marked_at).slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 7);
  }, [filteredRecords]);

  const reportRows = () => filteredRecords.map((r) => {
    const s = filteredSessions.find((x) => x.id === r.session_id);
    return [
      String(s?.held_on ?? "").slice(0, 10),
      s?.courses?.code ?? "",
      s?.courses?.department ?? "",
      nameOf(s?.lecturer_id ?? null),
      r.profiles?.full_name ?? "Student",
      r.status,
      methodLabel(r.verification_method),
    ];
  });
  const headers = ["Date", "Course", "Department", "Lecturer", "Student", "Status", "Method"];

  return (
    <>
      <PageTitle
        title="Attendance analytics"
        subtitle="Institution-wide attendance across departments, lecturers and courses."
        action={
          <span className="flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={() => downloadCsv("attendance-report.csv", [headers, ...reportRows()])}>Export CSV</button>
            <button type="button" className={btnGhost} onClick={() => printDocument("Attendance report", reportTableHtml("Attendance report", headers, reportRows()))}>Export PDF</button>
          </span>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Sessions" value={filteredSessions.length} />
        <StatCard icon={Users} label="Check-ins" value={filteredRecords.length} hint={`${todayCount} today`} />
        <StatCard icon={Percent} label="Attendance rate" value={`${rate}%`} hint="Present or late" />
        <StatCard icon={Building2} label="Departments" value={byDepartment.length} />
      </div>

      <div className="mt-6">
        <Panel title="Filters">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Department">
              <select className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d: any) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Lecturer">
              <select className={inputClass} value={lecturer} onChange={(e) => setLecturer(e.target.value)}>
                <option value="">All lecturers</option>
                {lecturers.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </Field>
            <Field label="Course">
              <select className={inputClass} value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="">All courses</option>
                {courseOptions.map(([id, c]: any) => <option key={id} value={id}>{c.code} — {c.title}</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <select className={inputClass} value={semester} onChange={(e) => setSemester(e.target.value)}>
                <option value="">All semesters</option>
                <option value="First">First</option>
                <option value="Second">Second</option>
              </select>
            </Field>
            <Field label="Date"><input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Search student"><input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" /></Field>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Department comparison">
          {byDepartment.length ? (
            <div className="space-y-3">
              {byDepartment.map((d) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-ink-muted">{d.attended}/{d.total} · {d.percent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full gradient-brand" style={{ width: `${d.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty message="No attendance data for these filters." />}
        </Panel>

        <Panel title="Daily overview">
          {dailyOverview.length ? (
            <Rows>
              {dailyOverview.map(([day, count]) => (
                <Row key={day}>
                  <span>{new Date(day).toDateString()}</span>
                  <Pill tone="good">{count} check-ins</Pill>
                </Row>
              ))}
            </Rows>
          ) : <Empty message="No check-ins recorded yet." />}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title={`Attendance records (${filteredRecords.length})`}>
          {filteredRecords.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-ink-muted">
                    {headers.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 200).map((r) => {
                    const s = filteredSessions.find((x) => x.id === r.session_id);
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-3 py-2">{String(s?.held_on ?? "").slice(0, 10)}</td>
                        <td className="px-3 py-2">{s?.courses?.code ?? "—"}</td>
                        <td className="px-3 py-2">{s?.courses?.department ?? "—"}</td>
                        <td className="px-3 py-2">{nameOf(s?.lecturer_id ?? null)}</td>
                        <td className="px-3 py-2">{r.profiles?.full_name ?? "Student"}</td>
                        <td className="px-3 py-2"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td>
                        <td className="px-3 py-2">{methodLabel(r.verification_method)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty message="No records match these filters." />}
        </Panel>
      </div>
    </>
  );
}