import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, FilePlus2, Loader2, Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, formatDT, gradeShortAnswer, QUESTION_TYPES, QUESTION_TYPE_LABELS, type Exam, type QuestionType } from "@/lib/exams";
import { PageTitle, Panel, StatCard, Empty, Pill, Field, inputClass, btnPrimary, btnGhost, Rows, Row } from "@/components/dashboard/kit";

type Course = { id: string; code: string; title: string };
type ExamRow = Exam & { courses?: { code: string; title: string } | null };
type Question = { id: string; exam_id: string; question_text: string | null; prompt: string | null; question_type: string; marks: number; question_order: number; position: number | null; options?: { id: string; option_text: string; option_order: number; is_correct: boolean }[] };
type Attempt = { id: string; exam_id: string; student_id: string; score: number | null; percentage: number | null; status: string; submitted_at: string | null; auto_submitted: boolean; studentName?: string; answers?: Answer[] };
type Answer = { id: string; attempt_id: string; question_id: string; answer_text: string | null; marks_awarded: number | null; feedback: string | null; is_correct: boolean | null };

export function useLecturerExams(lecturerId: string | null) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const load = useCallback(async () => {
    if (!lecturerId) return;
    setLoading(true);
    const { data: courseRows } = await supabase.from("courses").select("id, code, title").eq("lecturer_id", lecturerId).order("code");
    const courseIds = (courseRows ?? []).map((course) => course.id);
    const { data: examRows } = courseIds.length ? await supabase.from("exams").select("*, courses(code, title)").in("course_id", courseIds).order("created_at", { ascending: false }) : { data: [] as ExamRow[] };
    const examIds = (examRows ?? []).map((exam) => exam.id);
    const [{ data: attemptRows }, { data: questionRows }] = await Promise.all([
      examIds.length ? supabase.from("exam_attempts").select("id, exam_id, student_id, score, percentage, status, submitted_at, auto_submitted").in("exam_id", examIds).order("submitted_at", { ascending: false }) : Promise.resolve({ data: [] as Attempt[] }),
      examIds.length ? supabase.from("exam_questions").select("id, exam_id, question_text, prompt, question_type, marks, question_order, position, question_options(id, option_text, option_order, is_correct)").in("exam_id", examIds).order("question_order") : Promise.resolve({ data: [] as Question[] }),
    ]);
    const attemptData = (attemptRows as Attempt[]) ?? [];
    const studentIds = [...new Set(attemptData.map((attempt) => attempt.student_id))];
    const [{ data: studentRows }, { data: answerRows }] = await Promise.all([
      studentIds.length ? supabase.from("profiles").select("id, full_name").in("id", studentIds) : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      attemptData.length ? supabase.from("student_answers").select("id, attempt_id, question_id, answer_text, marks_awarded, feedback, is_correct").in("attempt_id", attemptData.map((attempt) => attempt.id)) : Promise.resolve({ data: [] as Answer[] }),
    ]);
    const names = new Map((studentRows ?? []).map((student) => [student.id, student.full_name]));
    setCourses((courseRows as Course[]) ?? []); setExams((examRows as ExamRow[]) ?? []); setQuestions((questionRows as Question[]) ?? []); setAnswers((answerRows as Answer[]) ?? []);
    setAttempts(attemptData.map((attempt) => ({ ...attempt, studentName: names.get(attempt.student_id) ?? "Student", answers: (answerRows ?? []).filter((answer) => answer.attempt_id === attempt.id) })));
    setLoading(false);
  }, [lecturerId]);
  useEffect(() => { void load(); }, [load]);
  const submitted = attempts.filter((attempt) => attempt.submitted_at);
  const pending = answers.filter((answer) => answer.answer_text && answer.marks_awarded == null).length;
  return { loading, courses, exams, attempts, questions, stats: { exams: exams.length, published: exams.filter((exam) => exam.status === "published").length, submissions: submitted.length, pending }, reload: load };
}

export function LecturerExamsPanel({ state, lecturerId }: { state: ReturnType<typeof useLecturerExams>; lecturerId: string }) {
  const { loading, courses, exams, attempts, questions, stats, reload } = state;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function createExam(payload: Record<string, unknown>) {
    setError(null);
    const { error: dbError } = await supabase.from("exams").insert({ ...payload, lecturer_id: lecturerId, created_by: lecturerId, status: "draft", is_published: false });
    if (dbError) setError(dbError.message); else { setMessage("Exam draft created."); void reload(); }
  }
  async function changeStatus(exam: ExamRow) {
    const next = exam.status === "published" ? "closed" : "published";
    const { error: dbError } = await supabase.from("exams").update({ status: next, is_published: next === "published" }).eq("id", exam.id);
    setMessage(dbError ? null : next === "published" ? "Exam published — eligible students can now start it." : "Exam closed."); setError(dbError?.message ?? null); void reload();
  }
  return (
    <>
      <PageTitle title="CBT examinations" subtitle="Build secure question papers, publish exam windows and review submissions." />
      {message ? <p className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-emerald-soft px-4 py-2.5 text-sm text-emerald"><CheckCircle2 className="size-4" /> {message}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-border bg-flame-soft px-4 py-2.5 text-sm text-flame">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={FilePlus2} label="Total exams" value={stats.exams} /><StatCard icon={CheckCircle2} label="Published" value={stats.published} /><StatCard icon={Users} label="Submitted attempts" value={stats.submissions} /><StatCard icon={BarChart3} label="Short answers pending" value={stats.pending} /></div>
      <div className="mt-6"><Panel title="Create examination"><ExamForm courses={courses} onSubmit={createExam} /></Panel></div>
      <div className="mt-6"><Panel title="Your examination papers">{loading ? <Loading /> : exams.length ? <div className="space-y-4">{exams.map((exam) => <ExamBuilder key={exam.id} exam={exam} questions={questions.filter((question) => question.exam_id === exam.id)} attempts={attempts.filter((attempt) => attempt.exam_id === exam.id)} onStatus={() => void changeStatus(exam)} onChanged={() => void reload()} />)}</div> : <Empty message="Create an exam to start building your question paper." />}</Panel></div>
    </>
  );
}

function ExamForm({ courses, onSubmit }: { courses: Course[]; onSubmit: (payload: Record<string, unknown>) => Promise<void> }) {
  const [courseId, setCourseId] = useState(""); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [instructions, setInstructions] = useState(""); const [duration, setDuration] = useState("45"); const [passMark, setPassMark] = useState("50"); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [review, setReview] = useState(false); const [multiple, setMultiple] = useState(false); const [busy, setBusy] = useState(false);
  return <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={async (event) => { event.preventDefault(); setBusy(true); await onSubmit({ course_id: courseId, title, description: description || null, instructions: instructions || null, duration_minutes: Number(duration), total_marks: 0, pass_mark: Number(passMark), start_time: start ? new Date(start).toISOString() : null, end_time: end ? new Date(end).toISOString() : null, starts_at: start ? new Date(start).toISOString() : null, allow_result_review: review, allow_multiple_attempts: multiple }); setBusy(false); setTitle(""); }}>
    <Field label="Course"><select required className={inputClass} value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}</select></Field>
    <Field label="Exam title"><input required className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Mid-semester assessment" /></Field>
    <Field label="Duration (minutes)"><input required type="number" min="5" className={inputClass} value={duration} onChange={(event) => setDuration(event.target.value)} /></Field>
    <Field label="Pass mark (%)"><input required type="number" min="0" max="100" className={inputClass} value={passMark} onChange={(event) => setPassMark(event.target.value)} /></Field>
    <Field label="Opens"><input type="datetime-local" className={inputClass} value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="Closes"><input type="datetime-local" className={inputClass} value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
    <div className="flex items-end gap-5 pb-2 sm:col-span-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={review} onChange={(event) => setReview(event.target.checked)} /> Allow result review</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} /> Multiple attempts</label></div>
    <div className="sm:col-span-2"><Field label="Description"><input className={inputClass} value={description} onChange={(event) => setDescription(event.target.value)} /></Field></div><div className="sm:col-span-2"><Field label="Instructions"><textarea className={`${inputClass} h-20 py-2.5`} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></Field></div>
    <button disabled={busy} className="sm:col-span-2 lg:col-span-1" type="submit" className={btnPrimary}><Plus className="size-4" /> {busy ? "Creating…" : "Create draft"}</button>
  </form>;
}

function ExamBuilder({ exam, questions, attempts, onStatus, onChanged }: { exam: ExamRow; questions: Question[]; attempts: Attempt[]; onStatus: () => void; onChanged: () => void }) {
  const [open, setOpen] = useState(false); const [type, setType] = useState<QuestionType>("mcq"); const [text, setText] = useState(""); const [marks, setMarks] = useState("1"); const [options, setOptions] = useState("Option A\nOption B\nOption C\nOption D"); const [correct, setCorrect] = useState("1"); const [busy, setBusy] = useState(false); const [showResults, setShowResults] = useState(false);
  async function addQuestion(event: React.FormEvent) { event.preventDefault(); setBusy(true); const lines = options.split("\n").map((line) => line.trim()).filter(Boolean); const { data, error } = await supabase.from("exam_questions").insert({ exam_id: exam.id, question_text: text, prompt: text, question_type: type, marks: Number(marks), question_order: questions.length + 1, position: questions.length + 1, correct_index: type === "short_answer" ? null : Number(correct) - 1 }).select("id").single(); if (!error && data && type !== "short_answer") { const values = type === "true_false" ? ["True", "False"] : lines; await supabase.from("question_options").insert(values.map((option, index) => ({ question_id: data.id, option_text: option, option_order: index + 1, is_correct: index === Number(correct) - 1 }))); } setBusy(false); if (error) window.alert(error.message); else { setText(""); onChanged(); } }
  async function removeQuestion(question: Question) { if (!window.confirm("Delete this question?")) return; await supabase.from("question_options").delete().eq("question_id", question.id); await supabase.from("exam_questions").delete().eq("id", question.id); onChanged(); }
  return <div className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{exam.courses?.code ?? "Course"} — {exam.title}</p><p className="mt-1 text-xs text-ink-muted">{questions.length} questions · {exam.total_marks} marks · {exam.duration_minutes} minutes{exam.start_time ? ` · opens ${formatDT(exam.start_time)}` : ""}</p></div><div className="flex flex-wrap items-center gap-2"><Pill tone={exam.status === "published" ? "good" : exam.status === "closed" ? "muted" : "warn"}>{exam.status}</Pill><button type="button" className={btnGhost} onClick={onStatus}>{exam.status === "published" ? "Close exam" : "Publish exam"}</button><button type="button" aria-label="Toggle exam builder" className={btnGhost} onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></div></div>
    {open ? <><div className="mt-4"><Rows>{questions.length ? questions.map((question, index) => <Row key={question.id}><span><span className="font-medium">{index + 1}. {question.question_text ?? question.prompt}</span><span className="block text-xs text-ink-muted">{QUESTION_TYPE_LABELS[question.question_type] ?? question.question_type} · {question.marks} mark{question.marks === 1 ? "" : "s"}{question.options?.length ? ` · ${question.options.length} options` : ""}</span></span><button type="button" aria-label={`Delete question ${index + 1}`} className="text-ink-muted hover:text-flame" onClick={() => void removeQuestion(question)}><Trash2 className="size-4" /></button></Row>) : <Empty message="No questions added yet." />}</Rows></div><form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(event) => void addQuestion(event)}><div className="sm:col-span-2"><Field label="Question"><textarea required className={`${inputClass} h-20 py-2.5`} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write the question prompt" /></Field></div><Field label="Type"><select className={inputClass} value={type} onChange={(event) => setType(event.target.value as QuestionType)}>{QUESTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field><Field label="Marks"><input type="number" min="1" className={inputClass} value={marks} onChange={(event) => setMarks(event.target.value)} /></Field>{type !== "short_answer" ? <><div className="sm:col-span-2"><Field label={type === "mcq" ? "Options (one per line)" : "Answer choices"}><textarea className={`${inputClass} h-20 py-2.5`} value={type === "true_false" ? "True\nFalse" : options} disabled={type === "true_false"} onChange={(event) => setOptions(event.target.value)} /></Field></div><Field label="Correct option #"><input type="number" min="1" max={type === "true_false" ? 2 : undefined} className={inputClass} value={correct} onChange={(event) => setCorrect(event.target.value)} /></Field></> : null}<div className="flex items-end"><button disabled={busy} className={btnPrimary} type="submit"><Plus className="size-4" /> {busy ? "Adding…" : "Add question"}</button></div></form><div className="mt-5 border-t border-border pt-4"><button type="button" className={btnGhost} onClick={() => setShowResults((value) => !value)}><BarChart3 className="size-4" /> {showResults ? "Hide results" : `View results (${attempts.length})`}</button>{showResults ? <div className="mt-3">{attempts.length ? <Rows>{attempts.map((attempt) => <ResultRow key={attempt.id} attempt={attempt} questions={questions} onGraded={onChanged} />)}</Rows> : <Empty message="No student attempts yet." />}</div> : null}</div></> : null}
  </div>;
}

function ResultRow({ attempt, questions, onGraded }: { attempt: Attempt; questions: Question[]; onGraded: () => void }) { const [answerOpen, setAnswerOpen] = useState(false); const shortAnswers = (attempt.answers ?? []).filter((answer) => questions.find((question) => question.id === answer.question_id)?.question_type === "short_answer"); return <div className="border-b border-border px-4 py-3 last:border-0"><div className="flex flex-wrap items-center justify-between gap-3"><span><span className="font-medium">{attempt.studentName ?? "Student"}</span><span className="block text-xs text-ink-muted">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : "In progress"}{attempt.auto_submitted ? " · auto-submitted" : ""}</span></span><span className="flex items-center gap-2"><Pill tone={attempt.submitted_at ? "good" : "warn"}>{attempt.percentage ?? attempt.score ?? 0}%</Pill>{shortAnswers.length ? <button type="button" className={btnGhost} onClick={() => setAnswerOpen((value) => !value)}>{answerOpen ? "Hide answers" : `${shortAnswers.length} short answer${shortAnswers.length === 1 ? "" : "s"}`}</button> : null}</span></div>{answerOpen ? <div className="mt-3 space-y-3">{shortAnswers.map((answer) => <ShortAnswerRow key={answer.id} answer={answer} max={questions.find((question) => question.id === answer.question_id)?.marks ?? 1} onDone={onGraded} />)}</div> : null}</div>; }
function ShortAnswerRow({ answer, max, onDone }: { answer: Answer; max: number; onDone: () => void }) { const [marks, setMarks] = useState(String(answer.marks_awarded ?? "")); const [feedback, setFeedback] = useState(answer.feedback ?? ""); const [busy, setBusy] = useState(false); return <div className="rounded-lg border border-border p-3"><p className="text-sm whitespace-pre-wrap">{answer.answer_text || "No answer provided."}</p><div className="mt-2 flex flex-wrap items-center gap-2"><input aria-label="Marks awarded" type="number" min="0" max={max} className={`${inputClass} h-9 w-24`} value={marks} onChange={(event) => setMarks(event.target.value)} placeholder={`/${max}`} /><input aria-label="Feedback" className={`${inputClass} h-9 min-w-48 flex-1`} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Feedback for student" /><button type="button" disabled={busy || marks === ""} className={btnGhost} onClick={async () => { setBusy(true); try { await gradeShortAnswer(answer.id, Number(marks), feedback); onDone(); } catch (error) { window.alert(friendlyError(error)); } finally { setBusy(false); } }}>Save grade</button></div></div>; }
function Loading() { return <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading examination data…</p>; }