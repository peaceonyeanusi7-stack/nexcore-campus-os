import type { Tables } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type RegistrationPeriod = Tables<"registration_periods">;
export type CourseRegistration = Tables<"course_registrations">;

export const SEMESTERS = ["First", "Second"] as const;
export const COURSE_STATUSES = ["active", "inactive"] as const;

export type PeriodState = {
  period: RegistrationPeriod | null;
  open: boolean;
  label: string;
  daysLeft: number | null;
};

export function periodState(period: RegistrationPeriod | null | undefined): PeriodState {
  if (!period) {
    return { period: null, open: true, label: "No registration period set — registration is open", daysLeft: null };
  }
  const now = Date.now();
  const opens = new Date(period.opens_at).getTime();
  const closes = new Date(period.closes_at).getTime();
  const daysLeft = Math.ceil((closes - now) / 86_400_000);
  if (now < opens) {
    return { period, open: false, label: `Registration opens ${new Date(opens).toDateString()}`, daysLeft: null };
  }
  if (now > closes) {
    return { period, open: false, label: `Registration closed on ${new Date(closes).toDateString()}`, daysLeft: 0 };
  }
  return {
    period,
    open: true,
    label: `Registration closes ${new Date(closes).toDateString()} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)`,
    daysLeft,
  };
}

export function courseErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") {
    if (error.message.includes("courses_code_unique")) return "That course code already exists.";
    return "You have already registered for this course.";
  }
  return error.message.replace(/^new row violates.*$/i, "You are not allowed to perform this action.");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens a print-ready window (browsers can "Save as PDF" from the print dialog). */
export function printDocument(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:40px}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#64748b;font-size:12px}
  .brand{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f3d8a;padding-bottom:12px;margin-bottom:20px}
  .brand strong{color:#0f3d8a;font-size:18px;letter-spacing:-.02em}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left}
  th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569}
  tfoot td{font-weight:600;background:#f8fafc}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 24px;font-size:13px}
  .sign{margin-top:48px;display:flex;justify-content:space-between;font-size:12px;color:#475569}
  .sign div{border-top:1px solid #94a3b8;padding-top:6px;width:220px;text-align:center}
</style></head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}