import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Exam = Tables<"exams">;
export type ExamQuestion = Tables<"exam_questions">;
export type QuestionOption = Tables<"question_options">;
export type ExamAttempt = Tables<"exam_attempts">;
export type StudentAnswer = Tables<"student_answers">;

export type QuestionType = "mcq" | "true_false" | "short_answer";

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "mcq", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
];

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "Multiple choice",
  true_false: "True / False",
  short_answer: "Short answer",
};

export const EXAM_STATUSES = ["draft", "published", "closed", "archived"] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export type PaperQuestion = {
  question_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  question_order: number;
  options: { id: string; option_text: string }[];
  selected_option_id: string | null;
  answer_text: string | null;
};

export type ExamWindowState = "draft" | "upcoming" | "active" | "ended" | "closed" | "archived";

/** Derives the live availability of an exam from its status and window. */
export function examWindow(exam: Pick<Exam, "status" | "start_time" | "end_time">): {
  state: ExamWindowState;
  label: string;
  tone: "good" | "warn" | "muted";
} {
  if (exam.status === "draft") return { state: "draft", label: "Draft", tone: "muted" };
  if (exam.status === "archived") return { state: "archived", label: "Archived", tone: "muted" };
  if (exam.status === "closed") return { state: "closed", label: "Closed", tone: "muted" };
  const now = Date.now();
  if (exam.start_time && now < new Date(exam.start_time).getTime()) {
    return { state: "upcoming", label: `Opens ${formatDT(exam.start_time)}`, tone: "warn" };
  }
  if (exam.end_time && now > new Date(exam.end_time).getTime()) {
    return { state: "ended", label: "Window closed", tone: "muted" };
  }
  return { state: "active", label: "Available now", tone: "good" };
}

export function formatDT(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** ISO → value for <input type="datetime-local"> in the viewer's timezone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Hard deadline for an attempt: start + duration, capped by the exam end time. */
export function attemptDeadline(
  attempt: Pick<ExamAttempt, "started_at">,
  exam: Pick<Exam, "duration_minutes" | "end_time">,
) {
  const byDuration = new Date(attempt.started_at).getTime() + exam.duration_minutes * 60_000;
  const byWindow = exam.end_time ? new Date(exam.end_time).getTime() : Infinity;
  return Math.min(byDuration, byWindow);
}

export function isPass(attempt: Pick<ExamAttempt, "score">, exam: Pick<Exam, "pass_mark">) {
  return Number(attempt.score ?? 0) >= Number(exam.pass_mark ?? 0);
}

export function friendlyError(error: unknown) {
  const message = (error as { message?: string })?.message ?? "";
  if (!message) return "Something went wrong. Please try again.";
  if (/fetch|network|failed to fetch/i.test(message)) {
    return "Network problem — check your connection and try again.";
  }
  return message.replace(/^.*?:\s*/, "").trim() || message;
}

export async function startAttempt(examId: string) {
  const { data, error } = await supabase.rpc("start_exam_attempt", { _exam_id: examId });
  if (error) throw error;
  return data as string;
}

export async function fetchPaper(attemptId: string) {
  const { data, error } = await supabase.rpc("get_exam_paper", { _attempt_id: attemptId });
  if (error) throw error;
  return (data ?? []) as unknown as PaperQuestion[];
}

export async function saveAnswer(args: {
  attemptId: string;
  questionId: string;
  optionId?: string | null;
  text?: string | null;
}) {
  const { error } = await supabase.rpc("save_exam_answer", {
    _attempt_id: args.attemptId,
    _question_id: args.questionId,
    ...(args.optionId ? { _selected_option_id: args.optionId } : {}),
    ...(args.text != null ? { _answer_text: args.text } : {}),
  });
  if (error) throw error;
}

export async function submitAttempt(attemptId: string) {
  const { error } = await supabase.rpc("submit_exam_attempt", { _attempt_id: attemptId });
  if (error) throw error;
}