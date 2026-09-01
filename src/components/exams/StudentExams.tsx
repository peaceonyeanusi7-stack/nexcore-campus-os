import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Clock3, Loader2, MonitorCheck, Play, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { examWindow, friendlyError, startAttempt, formatDT, type Exam } from "@/lib/exams";
import { PageTitle, Panel, Pill, StatCard, Empty, btnGhost } from "@/components/dashboard/kit";

type ExamWithCourse = Exam & { courses?: { code: string; title: string } | null };
type Attempt = { id: string; exam_id: string; score: number | null; percentage: number | null; submitted_at: string | null; status: string; auto_submitted: boolean };

export function useStudentExams(studentId: string | null) {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamWithCourse[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const { data: registrations } = await supabase.from("course_registrations").select("course_id").eq("student_id", studentId).eq("status", "registered");
    const registeredIds = [...new Set((registrations ?? []).map((row) => row.course_id))];
    const [{ data: examRows }, { data: attemptRows }] = await Promise.all([
      registeredIds.length
        ? supabase.from("exams").select("*, courses(code, title)").in("course_id", registeredIds).in("status", ["published", "closed"]).order("start_time", { ascending: true })
        : Promise.resolve({ data: [] as ExamWithCourse[] }),
      supabase.from("exam_attempts").select("id, exam_id, score, percentage, submitted_at, status, auto_submitted").eq("student_id", studentId).order("created_at", { ascending: false }),
    ]);
    setExams((examRows as ExamWithCourse[]) ?? []);
    setAttempts((attemptRows as Attempt[]) ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);
  const completed = useMemo(() => attempts.filter((attempt) => attempt.submitted_at), [attempts]);
  const available = useMemo(() => exams.filter((exam) => !completed.some((attempt) => attempt.exam_id === exam.id)), [exams, completed]);
  const active = available.filter((exam) => examWindow(exam).state === "active").length;
  const upcoming = available.filter((exam) => examWindow(exam).state === "upcoming").length;
  const average = completed.length ? Math.round(completed.reduce((sum, attempt) => sum + Number(attempt.percentage ?? attempt.score ?? 0), 0) / completed.length) : 0;
  return { loading, exams, attempts, available, completed, stats: { active, upcoming, completed: completed.length, average }, reload: load };
}

export function StudentExamsPanel({ state }: { state: ReturnType<typeof useStudentExams> }) {
  const { loading, available, completed, attempts, stats, reload } = state;
  return (
    <>
      <PageTitle title="CBT examinations" subtitle="Secure, timed assessments for your registered courses." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MonitorCheck} label="Available now" value={stats.active} />
        <StatCard icon={Clock3} label="Upcoming exams" value={stats.upcoming} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} />
        <StatCard icon={Award} label="Average score" value={stats.average ? `${stats.average}%` : "—"} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Your examination schedule">
          {loading ? <Loading label="Loading exams…" /> : available.length ? (
            <div className="space-y-3">
              {available.map((exam) => <StudentExamCard key={exam.id} exam={exam} onDone={() => void reload()} />)}
            </div>
          ) : <Empty message="No available exams for your registered courses." />}
        </Panel>
        <Panel title="Recent attempts">
          {loading ? <Loading label="Loading attempts…" /> : completed.length ? (
            <div className="space-y-3">
              {completed.slice(0, 8).map((attempt) => {
                const exam = state.exams.find((item) => item.id === attempt.exam_id);
                return <div key={attempt.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-medium">{exam?.courses?.code ?? "Course"} · {exam?.title ?? "Examination"}</p><p className="mt-1 text-xs text-ink-muted">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "In progress"}</p></div>
                    <Pill tone={Number(attempt.percentage ?? attempt.score ?? 0) >= Number(exam?.pass_mark ?? 50) ? "good" : "warn"}>{attempt.percentage ?? attempt.score ?? 0}%</Pill>
                  </div>
                  {attempt.auto_submitted ? <p className="mt-2 text-xs text-ink-muted">Auto-submitted when time expired.</p> : null}
                </div>;
              })}
            </div>
          ) : <Empty message="Completed attempts will appear here." />}
        </Panel>
      </div>
    </>
  );
}

function StudentExamCard({ exam, onDone }: { exam: ExamWithCourse; onDone: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const windowState = examWindow(exam);
  async function begin() {
    setBusy(true); setError(null);
    try {
      const attemptId = await startAttempt(exam.id);
      await navigate({ to: "/exam/$attemptId", params: { attemptId } });
    } catch (err) { setError(friendlyError(err)); setBusy(false); }
  }
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="font-medium">{exam.courses?.code ?? "Course"} — {exam.title}</p><p className="mt-1 text-xs text-ink-muted">{exam.duration_minutes} minutes · {exam.total_marks} marks · pass mark {exam.pass_mark}</p></div>
        <Pill tone={windowState.tone}>{windowState.label}</Pill>
      </div>
      {exam.description ? <p className="mt-3 text-sm text-ink-muted">{exam.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-ink-muted">
        <span>{exam.start_time ? `Opens ${formatDT(exam.start_time)}` : "Available during the exam period"}{exam.end_time ? ` · closes ${formatDT(exam.end_time)}` : ""}</span>
        {windowState.state === "active" ? <button type="button" disabled={busy} className={btnGhost} onClick={() => void begin()}><Play className="size-4" /> {busy ? "Preparing…" : "Start exam"}</button> : <span className="inline-flex items-center gap-1"><ShieldCheck className="size-4" /> Server-timed access</span>}
      </div>
      {error ? <p className="mt-3 text-sm text-flame">{error}</p> : null}
    </div>
  );
}

function Loading({ label }: { label: string }) { return <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> {label}</p>; }