import type { Tables } from "@/integrations/supabase/types";

export type AttendanceSession = Tables<"attendance_sessions">;
export type AttendanceRecord = Tables<"attendance_records">;

export const ATTENDANCE_METHODS = [
  { value: "qr", label: "QR Code" },
  { value: "manual", label: "Manual" },
  { value: "gps", label: "GPS (coming soon)" },
] as const;

export const ATTENDANCE_STATUSES = ["present", "late", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export function methodLabel(value: string | null | undefined) {
  return ATTENDANCE_METHODS.find((m) => m.value === value)?.label ?? "Manual";
}

export function statusTone(status: string | null | undefined): "good" | "warn" | "muted" {
  if (status === "present") return "good";
  if (status === "late") return "warn";
  return "muted";
}

/** Short human-friendly session code used for QR payloads and manual entry. */
export function newSessionCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isSameDay(dateStr: string | null | undefined) {
  return !!dateStr && String(dateStr).slice(0, 10) === todayIso();
}

/** Percentage of records that count as attended (present or late). */
export function attendedRate(records: { status: string | null }[]) {
  if (!records.length) return 0;
  const hit = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((hit / records.length) * 100);
}

export function sessionIsOpen(s: { status?: string | null; held_on?: string | null; expires_at?: string | null }) {
  if (s.status && s.status !== "open") return false;
  if (s.expires_at && Date.now() > new Date(s.expires_at).getTime()) return false;
  if (s.held_on && !isSameDay(s.held_on)) return false;
  return true;
}

export function attendanceErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "You have already marked attendance for this session.";
  return error.message.replace(/^new row violates.*$/i, "You are not allowed to mark this session.");
}

export function reportTableHtml(title: string, headers: string[], rows: (string | number)[][]) {
  return `<div class="brand"><div><strong>NexCore Campus OS</strong><div class="muted">Attendance report</div></div>
<div class="muted">Generated ${new Date().toLocaleString()}</div></div>
<h1>${title}</h1>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>
<div class="sign"><div>Registrar</div><div>Date</div></div>`;
}