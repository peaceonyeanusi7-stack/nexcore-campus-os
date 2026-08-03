import type { Tables } from "@/integrations/supabase/types";

export type Student = Tables<"students">;

export const STUDENT_STATUSES = ["active", "inactive", "graduated"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_LEVELS = ["100", "200", "300", "400", "500", "600"] as const;

export function studentInitials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NC";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export function statusTone(status: string): "good" | "warn" | "muted" {
  if (status === "active") return "good";
  if (status === "inactive") return "warn";
  return "muted";
}

/** Maps Postgres unique-violation errors to friendly copy. */
export function studentErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    if (error.message.includes("student_id")) return "That student ID is already in use.";
    if (error.message.includes("email")) return "That email address is already registered.";
    return "A student with those details already exists.";
  }
  return error.message;
}
