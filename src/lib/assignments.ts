import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Assignment = Tables<"assignments">;
export type Submission = Tables<"submissions">;

export const ASSIGNMENT_BUCKET = "assignment-files";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip", "rar", "txt", "png", "jpg", "jpeg", "webp",
] as const;

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

export function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `Unsupported file type ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum is ${MAX_UPLOAD_BYTES / 1048576} MB.`;
  }
  return null;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
}

/** Uploads to the private bucket and returns the storage path. */
export async function uploadAssignmentFile(folder: string, file: File): Promise<string> {
  const path = `${folder}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from(ASSIGNMENT_BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

/** Creates a short-lived signed URL and opens/downloads the file. */
export async function openStoredFile(path: string) {
  const { data, error } = await supabase.storage.from(ASSIGNMENT_BUCKET).createSignedUrl(path, 120, { download: true });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not open the file.");
  window.open(data.signedUrl, "_blank", "noopener");
}

export function fileLabel(path: string | null | undefined) {
  if (!path) return null;
  const base = path.split("/").pop() ?? path;
  return base.replace(/^\d+_/, "");
}

export function dueState(due: string | null | undefined) {
  if (!due) return { overdue: false, soon: false, label: "No deadline" };
  const ts = new Date(due).getTime();
  const diff = ts - Date.now();
  return {
    overdue: diff < 0,
    soon: diff > 0 && diff < 86_400_000,
    label: new Date(ts).toLocaleString(),
  };
}

export function submissionStatus(s: Submission | undefined) {
  if (!s) return { tone: "warn" as const, label: "Not submitted" };
  if (s.score != null) return { tone: "good" as const, label: "Graded" };
  return { tone: "muted" as const, label: "Submitted" };
}