import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, User, BookOpen, FileText, MonitorCheck, QrCode,
  Award, CalendarDays, Loader2, CheckCircle2, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/guard";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell, type DashboardSection } from "@/components/dashboard/DashboardShell";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { useLecturerCourses, LecturerCoursesPanel } from "@/components/courses/LecturerCourses";
import { useLecturerAttendance, LecturerAttendancePanel } from "@/components/attendance/LecturerAttendance";

export const Route = createFileRoute("/lecturer/dashboard")({
  ssr: false,
  beforeLoad: () => requireRole("lecturer"),
  head: () => ({
    meta: [
      { title: "Lecturer Dashboard — NexCore Campus OS" },
      { name: "description", content: "Manage courses, assignments, CBT exams, attendance, results and timetable." },
    ],
  }),
  component: LecturerDashboard,
});

const sections: DashboardSection[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "profile", label: "Profile", icon: User },
  { key: "courses", label: "Manage courses", icon: BookOpen },
  { key: "classlists", label: "Class lists", icon: Users },
  { key: "assignments", label: "Assignments", icon: FileText },
  { key: "exams", label: "CBT exams", icon: MonitorCheck },
  { key: "attendance", label: "Attendance", icon: QrCode },
  { key: "results", label: "Results", icon: Award },
  { key: "timetable", label: "Timetable", icon: CalendarDays },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function LecturerDashboard() {
  const { userId, profile, role, signOut, refresh } = useAuth();
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const reg = useLecturerCourses(userId ?? null);
  const att = useLecturerAttendance(userId ?? null);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: myCourses } = await supabase
      .from("courses").select("id, code, title, units, level, semester").eq("lecturer_id", userId).order("code");
    const ids = (myCourses ?? []).map((c: any) => c.id);
    const [en, asg, ex, ses, res, tt] = await Promise.all([
      ids.length ? supabase.from("enrollments").select("id, course_id, student_id, profiles:student_id(full_name, email)").in("course_id", ids) : { data: [] },
      ids.length ? supabase.from("assignments").select("id, title, due_date, max_score, course_id, courses(code)").in("course_id", ids) : { data: [] },
      ids.length ? supabase.from("exams").select("id, title, duration_minutes, is_published, course_id, courses(code)").in("course_id", ids) : { data: [] },
      ids.length ? supabase.from("attendance_sessions").select("id, title, session_code, held_on, course_id, courses(code)").in("course_id", ids).order("held_on", { ascending: false }) : { data: [] },
      ids.length ? supabase.from("results").select("id, score, grade, session, semester, student_id, course_id, courses(code)").in("course_id", ids) : { data: [] },
      ids.length ? supabase.from("timetable_entries").select("id, day_of_week, start_time, end_time, venue, course_id, courses(code)").in("course_id", ids) : { data: [] },
    ]);
    const asgIds = (asg.data ?? []).map((a: any) => a.id);
    const [subs, recs] = await Promise.all([
      asgIds.length ? supabase.from("submissions").select("id, assignment_id, student_id, content, score, feedback, profiles:student_id(full_name)").in("assignment_id", asgIds) : { data: [] },
      (ses.data ?? []).length ? supabase.from("attendance_records").select("id, session_id, status, student_id, profiles:student_id(full_name)").in("session_id", (ses.data ?? []).map((s: any) => s.id)) : { data: [] },
    ]);
    setCourses(myCourses ?? []);
    setEnrollments(en.data ?? []);
    setAssignments(asg.data ?? []);
    setExams(ex.data ?? []);
    setAttSessions(ses.data ?? []);
    setResults(res.data ?? []);
    setTimetable(tt.data ?? []);
    setSubmissions(subs.data ?? []);
    setAttRecords(recs.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  function flash(text: string) { setMsg(text); void loadAll(); }

  if (!role) return <Loading />;

  return (
    <DashboardShell
      role="lecturer"
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
      {loading ? <Loading /> : null}

      {active === "overview" && (
        <>
          <PageTitle title={`Good day, ${profile?.full_name?.split(" ")[0] ?? "lecturer"}`} subtitle="Your teaching load at a glance." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BookOpen} label="Assigned courses" value={reg.courses.length} />
            <StatCard icon={Users} label="Enrolled students" value={new Set(reg.rows.map((r) => r.student_id)).size} hint={`${reg.rows.length} course registrations`} />
            <StatCard icon={FileText} label="Submissions to grade" value={submissions.filter((s) => s.score == null).length} />
            <StatCard icon={QrCode} label="Active sessions" value={att.activeSessions.length} hint={`${att.presentToday} present today · ${att.rate}% rate`} />
          </div>
          <div className="mt-6">
            <Panel title="Your courses">
              {courses.length ? (
                <Rows>
                  {courses.map((c) => (
                    <Row key={c.id}>
                      <span><span className="font-medium">{c.code}</span> — {c.title}</span>
                      <Pill>{enrollments.filter((e) => e.course_id === c.id).length} students</Pill>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="Create your first course to get started." />}
            </Panel>
          </div>
        </>
      )}

      {active === "profile" && <ProfilePanel onSaved={refresh} />}

      {active === "classlists" && <LecturerCoursesPanel state={reg} />}

      {active === "courses" && (
        <>
          <PageTitle title="Manage courses" subtitle="Create the courses you teach; students can then register." />
          <Panel title="New course">
            <CourseForm lecturerId={userId!} onDone={() => flash("Course created.")} />
          </Panel>
          <div className="mt-6">
            <Panel title="Your courses">
              {courses.length ? (
                <Rows>
                  {courses.map((c) => (
                    <Row key={c.id}>
                      <span><span className="font-medium">{c.code}</span> — {c.title} <span className="text-xs text-ink-muted">{c.units} units</span></span>
                      <span className="flex items-center gap-2">
                        <Pill>{enrollments.filter((e) => e.course_id === c.id).length} students</Pill>
                        <button type="button" className={btnGhost} onClick={async () => { await supabase.from("courses").delete().eq("id", c.id); flash("Course removed."); }}>Delete</button>
                      </span>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No courses yet." />}
            </Panel>
          </div>
        </>
      )}

      {active === "assignments" && (
        <>
          <PageTitle title="Assignments" subtitle="Upload assignments and grade submissions." />
          <Panel title="Upload assignment">
            <AssignmentForm courses={courses} userId={userId!} onDone={() => flash("Assignment published.")} />
          </Panel>
          <div className="mt-6 space-y-4">
            {assignments.map((a) => (
              <Panel key={a.id} title={`${a.courses?.code} · ${a.title}`}>
                {submissions.filter((s) => s.assignment_id === a.id).length ? (
                  <Rows>
                    {submissions.filter((s) => s.assignment_id === a.id).map((s) => (
                      <GradeRow key={s.id} submission={s} max={a.max_score} onDone={() => flash("Grade saved.")} />
                    ))}
                  </Rows>
                ) : <Empty message="No submissions yet." />}
              </Panel>
            ))}
          </div>
        </>
      )}

      {active === "exams" && (
        <>
          <PageTitle title="CBT exams" subtitle="Create exams and add multiple-choice questions." />
          <Panel title="New exam">
            <ExamForm courses={courses} userId={userId!} onDone={() => flash("Exam created.")} />
          </Panel>
          <div className="mt-6 space-y-4">
            {exams.length ? exams.map((x) => (
              <ExamEditor key={x.id} exam={x} onDone={() => flash("Exam updated.")} />
            )) : <Empty message="No exams yet." />}
          </div>
        </>
      )}

      {active === "attendance" && userId ? (
        <LecturerAttendancePanel state={att} lecturerId={userId} />
      ) : null}

      {active === "results" && (
        <>
          <PageTitle title="Results" subtitle="Upload and publish course results." />
          <Panel title="Upload result">
            <ResultForm courses={courses} enrollments={enrollments} onDone={() => flash("Result uploaded.")} />
          </Panel>
          <div className="mt-6">
            <Panel title="Published results">
              {results.length ? (
                <Rows>
                  {results.map((r) => (
                    <Row key={r.id}>
                      <span>{r.courses?.code} · {enrollments.find((e) => e.student_id === r.student_id)?.profiles?.full_name ?? "Student"}</span>
                      <Pill tone="good">{r.score} · {r.grade ?? "-"}</Pill>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No results uploaded yet." />}
            </Panel>
          </div>
        </>
      )}

      {active === "timetable" && (
        <>
          <PageTitle title="Timetable" subtitle="Schedule lectures for your courses." />
          <Panel title="Add lecture slot">
            <TimetableForm courses={courses} onDone={() => flash("Timetable updated.")} />
          </Panel>
          <div className="mt-6">
            <Panel title="Your schedule">
              {timetable.length ? (
                <Rows>
                  {timetable.map((t) => (
                    <Row key={t.id}>
                      <span>{DAYS[t.day_of_week]} · {t.courses?.code}</span>
                      <span className="text-xs text-ink-muted">{String(t.start_time).slice(0, 5)}–{String(t.end_time).slice(0, 5)} · {t.venue ?? "TBA"}</span>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No lecture slots yet." />}
            </Panel>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function Loading() {
  return <div className="flex items-center gap-2 py-10 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
}

function CourseForm({ lecturerId, onDone }: { lecturerId: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [units, setUnits] = useState("3");
  const [level, setLevel] = useState("100");
  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("courses").insert({ code, title, units: Number(units), level, lecturer_id: lecturerId });
        setCode(""); setTitle("");
        onDone();
      }}
    >
      <Field label="Course code"><input required className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSC 201" /></Field>
      <Field label="Title"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Data Structures" /></Field>
      <Field label="Units"><input type="number" min="1" className={inputClass} value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
      <div className="flex items-end gap-3">
        <Field label="Level"><input className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
      </div>
      <button type="submit" className={`${btnPrimary} sm:col-span-2 lg:col-span-1`}>Create course</button>
    </form>
  );
}

function AssignmentForm({ courses, userId, onDone }: any) {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [due, setDue] = useState("");
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("assignments").insert({
          course_id: courseId, title, instructions, created_by: userId,
          due_date: due ? new Date(due).toISOString() : null,
        });
        setTitle(""); setInstructions(""); setDue("");
        onDone();
      }}
    >
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </Field>
      <Field label="Title"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Instructions"><input className={inputClass} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
      <Field label="Due date"><input type="datetime-local" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <button type="submit" className={btnPrimary}>Publish assignment</button>
    </form>
  );
}

function GradeRow({ submission, max, onDone }: any) {
  const [score, setScore] = useState(submission.score ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  return (
    <Row>
      <span className="min-w-40">
        <span className="font-medium">{submission.profiles?.full_name ?? "Student"}</span>
        <span className="block max-w-md truncate text-xs text-ink-muted">{submission.content}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <input className={`${inputClass} h-9 w-20`} value={score} onChange={(e) => setScore(e.target.value)} placeholder={`/${max}`} />
        <input className={`${inputClass} h-9 w-40`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" />
        <button
          type="button"
          className={btnGhost}
          onClick={async () => {
            await supabase.from("submissions").update({ score: score === "" ? null : Number(score), feedback }).eq("id", submission.id);
            onDone();
          }}
        >
          Save
        </button>
      </span>
    </Row>
  );
}

function ExamForm({ courses, userId, onDone }: any) {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("45");
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("exams").insert({ course_id: courseId, title, duration_minutes: Number(duration), created_by: userId });
        setTitle("");
        onDone();
      }}
    >
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
      </Field>
      <Field label="Exam title"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Duration (minutes)"><input type="number" min="5" className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      <button type="submit" className={btnPrimary}>Create exam</button>
    </form>
  );
}

function ExamEditor({ exam, onDone }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [prompt, setPrompt] = useState("");
  const [opts, setOpts] = useState("");
  const [correct, setCorrect] = useState("1");

  const load = useCallback(async () => {
    const { data } = await supabase.from("exam_questions").select("id, prompt, options, correct_index").eq("exam_id", exam.id).order("position");
    setQuestions(data ?? []);
  }, [exam.id]);
  useEffect(() => { void load(); }, [load]);

  return (
    <Panel
      title={`${exam.courses?.code} · ${exam.title}`}
      action={
        <button
          type="button"
          className={btnGhost}
          onClick={async () => { await supabase.from("exams").update({ is_published: !exam.is_published }).eq("id", exam.id); onDone(); }}
        >
          {exam.is_published ? "Unpublish" : "Publish"}
        </button>
      }
    >
      <Rows>
        {questions.map((q, i) => (
          <Row key={q.id}><span>{i + 1}. {q.prompt}</span><Pill>Answer {q.correct_index + 1}</Pill></Row>
        ))}
      </Rows>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const options = opts.split(",").map((o) => o.trim()).filter(Boolean);
          await supabase.from("exam_questions").insert({
            exam_id: exam.id, prompt, options, correct_index: Math.max(0, Number(correct) - 1), position: questions.length + 1,
          });
          setPrompt(""); setOpts(""); setCorrect("1");
          void load();
        }}
      >
        <Field label="Question"><input required className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
        <Field label="Options (comma separated)"><input required className={inputClass} value={opts} onChange={(e) => setOpts(e.target.value)} placeholder="A, B, C, D" /></Field>
        <Field label="Correct option #"><input type="number" min="1" className={inputClass} value={correct} onChange={(e) => setCorrect(e.target.value)} /></Field>
        <div className="flex items-end"><button type="submit" className={btnPrimary}>Add question</button></div>
      </form>
    </Panel>
  );
}

function ResultForm({ courses, enrollments, onDone }: any) {
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [score, setScore] = useState("");
  const [grade, setGrade] = useState("A");
  const students = enrollments.filter((e: any) => e.course_id === courseId);
  return (
    <form
      className="grid gap-4 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("results").insert({
          course_id: courseId, student_id: studentId, score: Number(score), grade,
          session: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, semester: "First",
        });
        setScore("");
        onDone();
      }}
    >
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
      </Field>
      <Field label="Student">
        <select required className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select student</option>
          {students.map((s: any) => <option key={s.student_id} value={s.student_id}>{s.profiles?.full_name ?? s.student_id}</option>)}
        </select>
      </Field>
      <Field label="Score"><input required type="number" min="0" max="100" className={inputClass} value={score} onChange={(e) => setScore(e.target.value)} /></Field>
      <Field label="Grade"><input className={inputClass} value={grade} onChange={(e) => setGrade(e.target.value)} /></Field>
      <button type="submit" className={btnPrimary}>Upload result</button>
    </form>
  );
}

function TimetableForm({ courses, onDone }: any) {
  const [courseId, setCourseId] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [venue, setVenue] = useState("");
  return (
    <form
      className="grid gap-4 sm:grid-cols-5"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("timetable_entries").insert({
          course_id: courseId, day_of_week: Number(day), start_time: start, end_time: end, venue,
        });
        setVenue("");
        onDone();
      }}
    >
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select</option>
          {courses.map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
      </Field>
      <Field label="Day">
        <select className={inputClass} value={day} onChange={(e) => setDay(e.target.value)}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </Field>
      <Field label="Start"><input type="time" className={inputClass} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      <Field label="End"><input type="time" className={inputClass} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      <Field label="Venue"><input className={inputClass} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="LT 1" /></Field>
      <button type="submit" className={btnPrimary}>Add slot</button>
    </form>
  );
}
