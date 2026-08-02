import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, User, BookOpen, FileText, MonitorCheck, Award,
  QrCode, CalendarDays, Bell, Loader2, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/guard";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell, type DashboardSection } from "@/components/dashboard/DashboardShell";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";

export const Route = createFileRoute("/student/dashboard")({
  ssr: false,
  beforeLoad: () => requireRole("student"),
  head: () => ({
    meta: [
      { title: "Student Dashboard — NexCore Campus OS" },
      { name: "description", content: "Your courses, assignments, CBT exams, results, attendance and timetable." },
    ],
  }),
  component: StudentDashboard,
});

const sections: DashboardSection[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "profile", label: "Profile", icon: User },
  { key: "courses", label: "Course registration", icon: BookOpen },
  { key: "assignments", label: "Assignments", icon: FileText },
  { key: "exams", label: "CBT exams", icon: MonitorCheck },
  { key: "results", label: "Results", icon: Award },
  { key: "attendance", label: "Attendance", icon: QrCode },
  { key: "timetable", label: "Timetable", icon: CalendarDays },
  { key: "notifications", label: "Notifications", icon: Bell },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Course = { id: string; code: string; title: string; units: number; level: string | null; semester: string | null };

function StudentDashboard() {
  const { userId, profile, role, signOut, refresh } = useAuth();
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [c, e, a, s, x, at, r, ar, t, n] = await Promise.all([
      supabase.from("courses").select("id, code, title, units, level, semester").order("code"),
      supabase.from("enrollments").select("course_id").eq("student_id", userId),
      supabase.from("assignments").select("id, title, instructions, due_date, max_score, course_id, courses(code, title)").order("due_date"),
      supabase.from("submissions").select("id, assignment_id, content, score, feedback").eq("student_id", userId),
      supabase.from("exams").select("id, title, duration_minutes, starts_at, is_published, course_id, courses(code)").eq("is_published", true),
      supabase.from("exam_attempts").select("id, exam_id, score, submitted_at").eq("student_id", userId),
      supabase.from("results").select("id, score, grade, session, semester, courses(code, title, units)").eq("student_id", userId),
      supabase.from("attendance_records").select("id, status, marked_at, attendance_sessions(title, held_on, courses(code))").eq("student_id", userId).order("marked_at", { ascending: false }),
      supabase.from("timetable_entries").select("id, day_of_week, start_time, end_time, venue, courses(code, title)"),
      supabase.from("notifications").select("id, title, body, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);
    setCourses((c.data as Course[]) ?? []);
    setEnrolled((e.data ?? []).map((row: any) => row.course_id));
    setAssignments(a.data ?? []);
    setSubmissions(s.data ?? []);
    setExams(x.data ?? []);
    setAttempts(at.data ?? []);
    setResults(r.data ?? []);
    setAttendance(ar.data ?? []);
    setTimetable(t.data ?? []);
    setNotifications(n.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const myCourses = useMemo(() => courses.filter((c) => enrolled.includes(c.id)), [courses, enrolled]);
  const myAssignments = useMemo(() => assignments.filter((a) => enrolled.includes(a.course_id)), [assignments, enrolled]);
  const myExams = useMemo(() => exams.filter((x) => enrolled.includes(x.course_id)), [exams, enrolled]);
  const gpa = useMemo(() => {
    if (!results.length) return "—";
    const pts = results.reduce((sum, r) => sum + Number(r.score ?? 0), 0) / results.length;
    return (Math.round((pts / 20) * 100) / 100).toFixed(2);
  }, [results]);

  async function toggleEnrollment(courseId: string) {
    if (!userId) return;
    if (enrolled.includes(courseId)) {
      await supabase.from("enrollments").delete().eq("course_id", courseId).eq("student_id", userId);
      setMsg("Course dropped.");
    } else {
      await supabase.from("enrollments").insert({ course_id: courseId, student_id: userId });
      setMsg("Course registered.");
    }
    await loadAll();
  }

  if (!role) return <FullLoader />;

  return (
    <DashboardShell
      role="student"
      name={profile?.full_name ?? ""}
      institution={profile?.institution ?? ""}
      sections={sections}
      active={active}
      onSelect={(k) => { setActive(k); setMsg(null); }}
      onSignOut={signOut}
    >
      {msg ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-2.5 text-sm text-emerald">
          <CheckCircle2 className="size-4" /> {msg}
        </p>
      ) : null}
      {loading ? <FullLoader /> : null}

      {active === "overview" && (
        <>
          <PageTitle title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "student"}`} subtitle="Here's how your semester is going." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BookOpen} label="Registered courses" value={myCourses.length} />
            <StatCard icon={FileText} label="Assignments due" value={myAssignments.filter((a) => !submissions.some((s) => s.assignment_id === a.id)).length} />
            <StatCard icon={QrCode} label="Attendance marks" value={attendance.length} />
            <StatCard icon={Award} label="Estimated GPA" value={gpa} hint="Based on published results" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Upcoming assignments">
              {myAssignments.length ? (
                <Rows>
                  {myAssignments.slice(0, 5).map((a) => (
                    <Row key={a.id}>
                      <span className="font-medium">{a.courses?.code} · {a.title}</span>
                      <Pill tone={submissions.some((s) => s.assignment_id === a.id) ? "good" : "warn"}>
                        {submissions.some((s) => s.assignment_id === a.id) ? "Submitted" : "Pending"}
                      </Pill>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No assignments yet. Register courses to see work here." />}
            </Panel>
            <Panel title="Latest notifications">
              {notifications.length ? (
                <Rows>
                  {notifications.slice(0, 5).map((n) => (
                    <Row key={n.id}><span>{n.title}</span><Pill tone={n.read ? "muted" : "good"}>{n.read ? "Read" : "New"}</Pill></Row>
                  ))}
                </Rows>
              ) : <Empty message="No notifications yet." />}
            </Panel>
          </div>
        </>
      )}

      {active === "profile" && <ProfilePanel onSaved={refresh} />}

      {active === "courses" && (
        <>
          <PageTitle title="Course registration" subtitle="Register or drop courses for the current semester." />
          <Panel>
            {courses.length ? (
              <Rows>
                {courses.map((c) => (
                  <Row key={c.id}>
                    <span>
                      <span className="font-medium">{c.code}</span> — {c.title}
                      <span className="ml-2 text-xs text-ink-muted">{c.units} units{c.level ? ` · ${c.level}` : ""}</span>
                    </span>
                    <button type="button" className={btnGhost} onClick={() => void toggleEnrollment(c.id)}>
                      {enrolled.includes(c.id) ? "Drop" : "Register"}
                    </button>
                  </Row>
                ))}
              </Rows>
            ) : <Empty message="No courses have been published by your institution yet." />}
          </Panel>
        </>
      )}

      {active === "assignments" && (
        <>
          <PageTitle title="Assignments" subtitle="Submit your work and track feedback." />
          <div className="space-y-4">
            {myAssignments.length ? myAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} submission={submissions.find((s) => s.assignment_id === a.id)} studentId={userId!} onDone={loadAll} />
            )) : <Empty message="No assignments for your registered courses yet." />}
          </div>
        </>
      )}

      {active === "exams" && (
        <>
          <PageTitle title="CBT exams" subtitle="Take computer-based tests published for your courses." />
          <div className="space-y-4">
            {myExams.length ? myExams.map((x) => (
              <ExamCard key={x.id} exam={x} attempt={attempts.find((at) => at.exam_id === x.id)} studentId={userId!} onDone={loadAll} />
            )) : <Empty message="No published exams for your courses yet." />}
          </div>
        </>
      )}

      {active === "results" && (
        <>
          <PageTitle title="Results" subtitle={`Estimated GPA: ${gpa}`} />
          <Panel>
            {results.length ? (
              <Rows>
                {results.map((r) => (
                  <Row key={r.id}>
                    <span><span className="font-medium">{r.courses?.code}</span> — {r.courses?.title}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-ink-muted">{r.session ?? ""} {r.semester ?? ""}</span>
                      <Pill tone="good">{r.score} · {r.grade ?? "-"}</Pill>
                    </span>
                  </Row>
                ))}
              </Rows>
            ) : <Empty message="No results published yet." />}
          </Panel>
        </>
      )}

      {active === "attendance" && (
        <AttendancePanel records={attendance} studentId={userId!} onDone={loadAll} setMsg={setMsg} />
      )}

      {active === "timetable" && (
        <>
          <PageTitle title="Timetable" subtitle="Your weekly lecture schedule." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((d, i) => {
              const entries = timetable.filter((t) => t.day_of_week === i);
              return (
                <Panel key={d} title={d}>
                  {entries.length ? (
                    <ul className="space-y-2 text-sm">
                      {entries.map((t) => (
                        <li key={t.id} className="rounded-lg border border-border px-3 py-2">
                          <p className="font-medium">{t.courses?.code} — {t.courses?.title}</p>
                          <p className="text-xs text-ink-muted">{String(t.start_time).slice(0, 5)}–{String(t.end_time).slice(0, 5)} · {t.venue ?? "TBA"}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-ink-muted">No lectures.</p>}
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {active === "notifications" && (
        <>
          <PageTitle title="Notifications" />
          <Panel>
            {notifications.length ? (
              <Rows>
                {notifications.map((n) => (
                  <Row key={n.id}>
                    <span>
                      <span className="font-medium">{n.title}</span>
                      {n.body ? <span className="block text-xs text-ink-muted">{n.body}</span> : null}
                    </span>
                    {!n.read ? (
                      <button type="button" className={btnGhost} onClick={async () => { await supabase.from("notifications").update({ read: true }).eq("id", n.id); void loadAll(); }}>
                        Mark read
                      </button>
                    ) : <Pill>Read</Pill>}
                  </Row>
                ))}
              </Rows>
            ) : <Empty message="You're all caught up." />}
          </Panel>
        </>
      )}
    </DashboardShell>
  );
}

function FullLoader() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin" /> Loading your campus data…
    </div>
  );
}

function AssignmentCard({ assignment, submission, studentId, onDone }: any) {
  const [content, setContent] = useState(submission?.content ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Panel title={`${assignment.courses?.code ?? ""} · ${assignment.title}`}>
      {assignment.instructions ? <p className="mb-3 text-sm text-ink-muted">{assignment.instructions}</p> : null}
      <p className="mb-3 text-xs text-ink-muted">
        Due {assignment.due_date ? new Date(assignment.due_date).toLocaleString() : "—"} · Max score {assignment.max_score}
      </p>
      {submission?.score != null ? (
        <Pill tone="good">Graded: {submission.score}/{assignment.max_score}{submission.feedback ? ` — ${submission.feedback}` : ""}</Pill>
      ) : null}
      <textarea
        className={`${inputClass} mt-3 h-28 py-2.5`}
        placeholder="Type your answer or paste a link to your work"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="button"
        disabled={busy || !content.trim()}
        className={`${btnPrimary} mt-3`}
        onClick={async () => {
          setBusy(true);
          if (submission) await supabase.from("submissions").update({ content }).eq("id", submission.id);
          else await supabase.from("submissions").insert({ assignment_id: assignment.id, student_id: studentId, content });
          setBusy(false);
          onDone();
        }}
      >
        {submission ? "Update submission" : "Submit"}
      </button>
    </Panel>
  );
}

function ExamCard({ exam, attempt, studentId, onDone }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function start() {
    const { data } = await supabase.from("exam_questions").select("id, prompt, options, correct_index, position").eq("exam_id", exam.id).order("position");
    setQuestions(data ?? []);
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    const correct = questions.filter((q) => answers[q.id] === q.correct_index).length;
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    await supabase.from("exam_attempts").insert({
      exam_id: exam.id, student_id: studentId, answers, score, submitted_at: new Date().toISOString(),
    });
    setBusy(false);
    setOpen(false);
    onDone();
  }

  if (attempt) {
    return (
      <Panel title={`${exam.courses?.code ?? ""} · ${exam.title}`}>
        <Pill tone="good">Completed — score {attempt.score ?? 0}%</Pill>
      </Panel>
    );
  }

  return (
    <Panel title={`${exam.courses?.code ?? ""} · ${exam.title}`} action={!open ? <button type="button" className={btnGhost} onClick={() => void start()}>Start exam</button> : null}>
      <p className="text-xs text-ink-muted">{exam.duration_minutes} minutes{exam.starts_at ? ` · opens ${new Date(exam.starts_at).toLocaleString()}` : ""}</p>
      {open && (
        <div className="mt-4 space-y-4">
          {questions.length ? questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium">{i + 1}. {q.prompt}</p>
              <div className="mt-2 space-y-1.5">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string, oi: number) => (
                  <label key={oi} className="flex items-center gap-2 text-sm text-ink-muted">
                    <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          )) : <Empty message="This exam has no questions yet." />}
          {questions.length ? (
            <button type="button" disabled={busy} className={btnPrimary} onClick={() => void submit()}>Submit exam</button>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function AttendancePanel({ records, studentId, onDone, setMsg }: any) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function mark(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("session_code", code.trim().toUpperCase())
      .maybeSingle();
    if (!session) {
      setError("No open session matches that code.");
      setBusy(false);
      return;
    }
    const { error: insertError } = await supabase
      .from("attendance_records")
      .insert({ session_id: session.id, student_id: studentId, status: "present" });
    setBusy(false);
    if (insertError) {
      setError(insertError.message.includes("duplicate") ? "You already marked attendance for this session." : insertError.message);
      return;
    }
    setCode("");
    setMsg("Attendance marked.");
    onDone();
  }

  return (
    <>
      <PageTitle title="Attendance" subtitle="Mark attendance with the session code or QR code shown in class." />
      <Panel title="Mark attendance">
        <form onSubmit={mark} className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <Field label="Session code">
              <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 4F9A2C" required />
            </Field>
          </div>
          <button type="submit" disabled={busy} className={btnPrimary}>Check in</button>
        </form>
        {error ? <p className="mt-3 text-sm text-flame">{error}</p> : null}
      </Panel>
      <div className="mt-6">
        <Panel title="History">
          {records.length ? (
            <Rows>
              {records.map((r: any) => (
                <Row key={r.id}>
                  <span>{r.attendance_sessions?.courses?.code ?? "Course"} · {r.attendance_sessions?.title ?? "Session"}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted">{new Date(r.marked_at).toLocaleDateString()}</span>
                    <Pill tone="good">{r.status}</Pill>
                  </span>
                </Row>
              ))}
            </Rows>
          ) : <Empty message="No attendance records yet." />}
        </Panel>
      </div>
    </>
  );
}
