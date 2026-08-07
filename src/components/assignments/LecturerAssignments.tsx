import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Upload, Paperclip, Trash2, Pencil, Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost,
} from "@/components/dashboard/kit";
import {
  ACCEPT_ATTR, dueState, fileLabel, openStoredFile, uploadAssignmentFile, validateFile,
  type Assignment, type Submission,
} from "@/lib/assignments";

type Course = { id: string; code: string; title: string };
type Sub = Submission & { profiles?: { full_name: string | null } | null };

export function useLecturerAssignments(lecturerId: string | null) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Sub[]>([]);

  const load = useCallback(async () => {
    if (!lecturerId) return;
    setLoading(true);
    const { data: cs } = await supabase.from("courses").select("id, code, title").eq("lecturer_id", lecturerId).order("code");
    const ids = (cs ?? []).map((c) => c.id);
    const { data: asg } = ids.length
      ? await supabase.from("assignments").select("*").in("course_id", ids).order("created_at", { ascending: false })
      : { data: [] as Assignment[] };
    const asgIds = (asg ?? []).map((a) => a.id);
    const { data: subs } = asgIds.length
      ? await supabase.from("submissions").select("*, profiles:student_id(full_name)").in("assignment_id", asgIds)
      : { data: [] as Sub[] };
    setCourses((cs as Course[]) ?? []);
    setAssignments((asg as Assignment[]) ?? []);
    setSubmissions((subs as Sub[]) ?? []);
    setLoading(false);
  }, [lecturerId]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const active = assignments.filter((a) => a.status === "published").length;
    const graded = submissions.filter((s) => s.score != null);
    const avg = graded.length
      ? Math.round((graded.reduce((sum, s) => sum + Number(s.score ?? 0), 0) / graded.length) * 10) / 10
      : 0;
    return { active, total: submissions.length, pending: submissions.length - graded.length, avg };
  }, [assignments, submissions]);

  return { loading, courses, assignments, submissions, stats, reload: load };
}

export function LecturerAssignmentsPanel({
  state, lecturerId,
}: { state: ReturnType<typeof useLecturerAssignments>; lecturerId: string }) {
  const { loading, courses, assignments, submissions, stats, reload } = state;
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const codeOf = (id: string) => courses.find((c) => c.id === id)?.code ?? "Course";
  const q = query.trim().toLowerCase();
  const list = assignments
    .filter((a) => !courseFilter || a.course_id === courseFilter)
    .filter((a) => !q || a.title.toLowerCase().includes(q) || codeOf(a.course_id).toLowerCase().includes(q));

  async function togglePublish(a: Assignment) {
    const { error } = await supabase.from("assignments")
      .update({ status: a.status === "published" ? "draft" : "published" }).eq("id", a.id);
    setMsg(error ? error.message : a.status === "published" ? "Assignment unpublished." : "Assignment published — students notified.");
    void reload();
  }

  async function remove(a: Assignment) {
    if (!window.confirm(`Delete "${a.title}" and all of its submissions? This cannot be undone.`)) return;
    await supabase.from("submissions").delete().eq("assignment_id", a.id);
    const { error } = await supabase.from("assignments").delete().eq("id", a.id);
    setMsg(error ? error.message : "Assignment deleted.");
    void reload();
  }

  return (
    <>
      <PageTitle title="Assignments" subtitle="Create, publish and grade coursework for your classes." />
      {msg ? <p className="mb-4 rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm">{msg}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Active assignments" value={stats.active} hint={`${assignments.length} total`} />
        <StatCard icon={Send} label="Total submissions" value={stats.total} />
        <StatCard icon={Pencil} label="Pending grading" value={stats.pending} />
        <StatCard icon={FileText} label="Average class score" value={stats.avg || "—"} />
      </div>

      <div className="mt-6">
        <Panel title={editing ? `Edit: ${editing.title}` : "Create assignment"}>
          <AssignmentForm
            key={editing?.id ?? "new"}
            courses={courses}
            lecturerId={lecturerId}
            assignment={editing}
            onCancel={() => setEditing(null)}
            onDone={(text) => { setEditing(null); setMsg(text); void reload(); }}
          />
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Your assignments"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${inputClass} h-9 w-full sm:w-44`} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                <option value="">All courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input className={`${inputClass} h-9 w-full pl-9 sm:w-56`} placeholder="Search assignments"
                  value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading assignments…</p>
          ) : list.length ? (
            <div className="space-y-4">
              {list.map((a) => {
                const subs = submissions.filter((s) => s.assignment_id === a.id);
                const due = dueState(a.due_date);
                return (
                  <div key={a.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{codeOf(a.course_id)} — {a.title}</p>
                        <p className="text-xs text-ink-muted">
                          Due {due.label} · Max {a.max_score} marks · {subs.length} submission{subs.length === 1 ? "" : "s"} · {subs.filter((s) => s.score != null).length} graded
                        </p>
                        {a.description ? <p className="mt-1 text-sm text-ink-muted">{a.description}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={a.status === "published" ? "good" : "muted"}>{a.status === "published" ? "Published" : "Draft"}</Pill>
                        {a.attachment_url ? (
                          <button type="button" className={btnGhost} onClick={() => void openStoredFile(a.attachment_url!)}>
                            <Paperclip className="size-4" /> {fileLabel(a.attachment_url)}
                          </button>
                        ) : null}
                        <button type="button" className={btnGhost} onClick={() => setEditing(a)}><Pencil className="size-4" /> Edit</button>
                        <button type="button" className={btnGhost} onClick={() => void togglePublish(a)}>
                          {a.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button type="button" className={btnGhost} onClick={() => void remove(a)}><Trash2 className="size-4" /> Delete</button>
                      </div>
                    </div>
                    {subs.length ? (
                      <Rows>
                        {subs.map((s) => (
                          <GradeRow key={s.id} submission={s} max={a.max_score} onDone={(t) => { setMsg(t); void reload(); }} />
                        ))}
                      </Rows>
                    ) : <Empty message="No submissions yet." />}
                  </div>
                );
              })}
            </div>
          ) : <Empty message="No assignments match your filters." />}
        </Panel>
      </div>
    </>
  );
}

function AssignmentForm({
  courses, lecturerId, assignment, onDone, onCancel,
}: {
  courses: Course[]; lecturerId: string; assignment: Assignment | null;
  onDone: (msg: string) => void; onCancel: () => void;
}) {
  const [courseId, setCourseId] = useState(assignment?.course_id ?? "");
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [instructions, setInstructions] = useState(assignment?.instructions ?? "");
  const [maxScore, setMaxScore] = useState(String(assignment?.max_score ?? 100));
  const [due, setDue] = useState(assignment?.due_date ? toLocalInput(assignment.due_date) : "");
  const [status, setStatus] = useState(assignment?.status ?? "published");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (file) {
      const bad = validateFile(file);
      if (bad) { setError(bad); return; }
    }
    setBusy(true);
    try {
      let attachment = assignment?.attachment_url ?? null;
      if (file) {
        setProgress("Uploading attachment…");
        attachment = await uploadAssignmentFile(`assignments/${courseId}`, file);
      }
      setProgress("Saving assignment…");
      const payload = {
        course_id: courseId,
        title,
        description: description || null,
        instructions: instructions || null,
        attachment_url: attachment,
        max_score: Number(maxScore) || 100,
        due_date: due ? new Date(due).toISOString() : null,
        status,
      };
      const { error: dbError } = assignment
        ? await supabase.from("assignments").update(payload).eq("id", assignment.id)
        : await supabase.from("assignments").insert({ ...payload, created_by: lecturerId });
      if (dbError) throw new Error(dbError.message);
      onDone(assignment ? "Assignment updated." : status === "published" ? "Assignment published — students notified." : "Draft saved.");
      if (!assignment) { setTitle(""); setDescription(""); setInstructions(""); setDue(""); setFile(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <Field label="Course">
        <select required className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
        </select>
      </Field>
      <Field label="Title"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lab report 1" /></Field>
      <Field label="Short description"><input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Field label="Due date"><input type="datetime-local" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <Field label="Total marks"><input type="number" min="1" className={inputClass} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} /></Field>
      <Field label="Status">
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Instructions">
          <textarea className={`${inputClass} h-24 py-2.5`} value={instructions} onChange={(e) => setInstructions(e.target.value)}
            placeholder="What students must do, format expected, grading notes…" />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Attachment (PDF, DOCX, PPT, ZIP, image — max 15 MB)">
          <input type="file" accept={ACCEPT_ATTR} className={`${inputClass} py-2.5 text-ink-muted`}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        {assignment?.attachment_url && !file ? (
          <p className="mt-1 text-xs text-ink-muted">Current file: {fileLabel(assignment.attachment_url)}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-flame sm:col-span-2">{error}</p> : null}
      {progress ? <p className="flex items-center gap-2 text-sm text-ink-muted sm:col-span-2"><Loader2 className="size-4 animate-spin" /> {progress}</p> : null}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className={btnPrimary}>
          <Upload className="size-4" /> {assignment ? "Save changes" : "Create assignment"}
        </button>
        {assignment ? <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button> : null}
      </div>
    </form>
  );
}

function GradeRow({ submission, max, onDone }: { submission: Sub; max: number; onDone: (msg: string) => void }) {
  const [score, setScore] = useState(submission.score != null ? String(submission.score) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [busy, setBusy] = useState(false);

  async function save(returned: boolean) {
    setBusy(true);
    const { error } = await supabase.from("submissions").update({
      score: score === "" ? null : Number(score),
      feedback: feedback || null,
      ...(returned ? { status: "returned" } : {}),
    }).eq("id", submission.id);
    setBusy(false);
    onDone(error ? error.message : returned ? "Graded assignment returned to the student." : "Grade saved.");
  }

  return (
    <Row>
      <span className="min-w-48">
        <span className="font-medium">{submission.profiles?.full_name ?? "Student"}</span>
        <span className="block max-w-md truncate text-xs text-ink-muted">
          {submission.content || "No text response"} · {new Date(submission.submitted_at).toLocaleString()}
        </span>
        {submission.file_url ? (
          <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"
            onClick={() => void openStoredFile(submission.file_url!)}>
            <Paperclip className="size-3" /> {fileLabel(submission.file_url)}
          </button>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Pill tone={submission.status === "returned" ? "good" : submission.score != null ? "good" : "muted"}>
          {submission.status === "returned" ? "Returned" : submission.score != null ? "Graded" : "Awaiting grade"}
        </Pill>
        <input className={`${inputClass} h-9 w-20`} value={score} onChange={(e) => setScore(e.target.value)} placeholder={`/${max}`} />
        <input className={`${inputClass} h-9 w-48`} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback" />
        <button type="button" disabled={busy} className={btnGhost} onClick={() => void save(false)}>Save</button>
        <button type="button" disabled={busy || score === ""} className={btnGhost} onClick={() => void save(true)}>Return</button>
      </span>
    </Row>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}