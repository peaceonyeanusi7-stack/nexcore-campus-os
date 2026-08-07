import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Paperclip, Upload, Clock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageTitle, Panel, StatCard, Empty, Pill, Field, inputClass, btnPrimary, btnGhost,
} from "@/components/dashboard/kit";
import {
  ACCEPT_ATTR, dueState, fileLabel, openStoredFile, uploadAssignmentFile, validateFile,
  type Assignment, type Submission,
} from "@/lib/assignments";

type Asg = Assignment & { courses?: { code: string; title: string } | null };

export function useStudentAssignments(studentId: string | null) {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Asg[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    const { data: en } = await supabase.from("enrollments").select("course_id").eq("student_id", studentId);
    const ids = (en ?? []).map((e) => e.course_id);
    const [{ data: asg }, { data: subs }] = await Promise.all([
      ids.length
        ? supabase.from("assignments").select("*, courses(code, title)").in("course_id", ids).eq("status", "published").order("due_date")
        : Promise.resolve({ data: [] as Asg[] }),
      supabase.from("submissions").select("*").eq("student_id", studentId),
    ]);
    setAssignments((asg as Asg[]) ?? []);
    setSubmissions((subs as Submission[]) ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const submittedIds = new Set(submissions.map((s) => s.assignment_id));
    const pending = assignments.filter((a) => !submittedIds.has(a.id));
    const graded = submissions.filter((s) => s.score != null);
    const avg = graded.length
      ? Math.round((graded.reduce((sum, s) => sum + Number(s.score ?? 0), 0) / graded.length) * 10) / 10
      : 0;
    const upcoming = pending.filter((a) => a.due_date && new Date(a.due_date).getTime() > Date.now()).length;
    return { pending: pending.length, upcoming, graded: graded.length, avg };
  }, [assignments, submissions]);

  return { loading, assignments, submissions, stats, reload: load };
}

export function StudentAssignmentsPanel({
  state, studentId,
}: { state: ReturnType<typeof useStudentAssignments>; studentId: string }) {
  const { loading, assignments, submissions, stats, reload } = state;
  const [courseFilter, setCourseFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const courses = useMemo(() => {
    const map = new Map<string, string>();
    assignments.forEach((a) => map.set(a.course_id, a.courses?.code ?? "Course"));
    return [...map.entries()];
  }, [assignments]);

  const list = assignments.filter((a) => !courseFilter || a.course_id === courseFilter);

  return (
    <>
      <PageTitle title="Assignments" subtitle="Submit your work, download briefs and read lecturer feedback." />
      {msg ? <p className="mb-4 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm">{msg}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Pending assignments" value={stats.pending} />
        <StatCard icon={Clock} label="Upcoming deadlines" value={stats.upcoming} />
        <StatCard icon={Award} label="Recently graded" value={stats.graded} />
        <StatCard icon={Award} label="Average score" value={stats.avg || "—"} />
      </div>

      <div className="mt-6">
        <Panel
          title="Your coursework"
          action={
            <select className={`${inputClass} h-9 w-full sm:w-48`} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="">All courses</option>
              {courses.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
            </select>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading assignments…</p>
          ) : list.length ? (
            <div className="space-y-4">
              {list.map((a) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  submission={submissions.find((s) => s.assignment_id === a.id)}
                  studentId={studentId}
                  onDone={(t) => { setMsg(t); void reload(); }}
                />
              ))}
            </div>
          ) : <Empty message="No assignments for your registered courses yet." />}
        </Panel>
      </div>
    </>
  );
}

function AssignmentCard({
  assignment, submission, studentId, onDone,
}: { assignment: Asg; submission?: Submission; studentId: string; onDone: (msg: string) => void }) {
  const due = dueState(assignment.due_date);
  const graded = submission?.score != null;
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(submission?.content ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = graded || (due.overdue && !submission);

  async function submit() {
    setError(null);
    if (file) {
      const bad = validateFile(file);
      if (bad) { setError(bad); return; }
    }
    if (!content.trim() && !file && !submission?.file_url) {
      setError("Add a text response or attach a file.");
      return;
    }
    setBusy(true);
    try {
      let path = submission?.file_url ?? null;
      if (file) {
        setProgress("Uploading your file…");
        path = await uploadAssignmentFile(`submissions/${studentId}/${assignment.id}`, file);
      }
      setProgress("Saving submission…");
      const { error: dbError } = submission
        ? await supabase.from("submissions").update({ content: content || null, file_url: path }).eq("id", submission.id)
        : await supabase.from("submissions").insert({
            assignment_id: assignment.id, student_id: studentId, content: content || null, file_url: path,
          });
      if (dbError) throw new Error(dbError.message);
      setFile(null);
      setOpen(false);
      onDone(submission ? "Submission updated." : "Assignment submitted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{assignment.courses?.code} — {assignment.title}</p>
          <p className="text-xs text-ink-muted">Due {due.label} · Max {assignment.max_score} marks</p>
          {assignment.description ? <p className="mt-1 text-sm text-ink-muted">{assignment.description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {graded ? <Pill tone="good">Graded {submission!.score}/{assignment.max_score}</Pill>
            : submission ? <Pill>Submitted</Pill>
            : due.overdue ? <Pill tone="warn">Closed</Pill>
            : due.soon ? <Pill tone="warn">Due in &lt; 24h</Pill>
            : <Pill tone="warn">Pending</Pill>}
          {assignment.attachment_url ? (
            <button type="button" className={btnGhost} onClick={() => void openStoredFile(assignment.attachment_url!)}>
              <Paperclip className="size-4" /> Brief
            </button>
          ) : null}
          {!locked ? (
            <button type="button" className={btnGhost} onClick={() => setOpen((o) => !o)}>
              {open ? "Close" : submission ? "Edit submission" : "Submit"}
            </button>
          ) : null}
        </div>
      </div>

      {assignment.instructions ? (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 text-sm text-ink-muted">{assignment.instructions}</p>
      ) : null}

      {submission ? (
        <div className="mt-3 rounded-lg border border-border px-3 py-2 text-sm">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Your submission · {new Date(submission.submitted_at).toLocaleString()}</p>
          {submission.content ? <p className="mt-1 whitespace-pre-wrap">{submission.content}</p> : null}
          {submission.file_url ? (
            <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"
              onClick={() => void openStoredFile(submission.file_url!)}>
              <Paperclip className="size-3" /> {fileLabel(submission.file_url)}
            </button>
          ) : null}
          {submission.feedback ? <p className="mt-2 text-sm"><span className="font-medium">Feedback:</span> {submission.feedback}</p> : null}
        </div>
      ) : null}

      {open && !locked ? (
        <div className="mt-3 space-y-3">
          <Field label="Text response">
            <textarea className={`${inputClass} h-28 py-2.5`} value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Type your answer or paste a link to your work" />
          </Field>
          <Field label="Attach a file (PDF, DOCX, PPT, ZIP, image — max 15 MB)">
            <input type="file" accept={ACCEPT_ATTR} className={`${inputClass} py-2.5 text-ink-muted`}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          {error ? <p className="text-sm text-flame">{error}</p> : null}
          {progress ? <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> {progress}</p> : null}
          <button type="button" disabled={busy} className={btnPrimary} onClick={() => void submit()}>
            <Upload className="size-4" /> {submission ? "Update submission" : "Submit assignment"}
          </button>
        </div>
      ) : null}

      {graded ? <p className="mt-2 text-xs text-ink-muted">Graded work can no longer be edited.</p> : null}
      {due.overdue && !submission ? <p className="mt-2 text-xs text-flame">The deadline has passed — submissions are closed.</p> : null}
    </div>
  );
}