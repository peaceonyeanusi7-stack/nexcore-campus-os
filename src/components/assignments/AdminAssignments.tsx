import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Download, Trash2, Paperclip, Search, BarChart3, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PageTitle, Panel, StatCard, Empty, Pill, inputClass, btnGhost,
} from "@/components/dashboard/kit";
import { downloadCsv } from "@/lib/courses";
import { fileLabel, openStoredFile, type Assignment, type Submission } from "@/lib/assignments";

type Asg = Assignment & { courses?: { code: string; title: string; department: string | null } | null };

export function useAdminAssignments() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Asg[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollments, setEnrollments] = useState<{ course_id: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, e] = await Promise.all([
      supabase.from("assignments").select("*, courses(code, title, department)").order("created_at", { ascending: false }),
      supabase.from("submissions").select("*"),
      supabase.from("enrollments").select("course_id"),
    ]);
    setAssignments((a.data as Asg[]) ?? []);
    setSubmissions((s.data as Submission[]) ?? []);
    setEnrollments((e.data as { course_id: string }[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const expected = assignments.reduce(
      (sum, a) => sum + enrollments.filter((e) => e.course_id === a.course_id).length, 0);
    const graded = submissions.filter((s) => s.score != null).length;
    return {
      total: assignments.length,
      submissions: submissions.length,
      submissionRate: expected ? Math.round((submissions.length / expected) * 100) : 0,
      gradingRate: submissions.length ? Math.round((graded / submissions.length) * 100) : 0,
    };
  }, [assignments, submissions, enrollments]);

  return { loading, assignments, submissions, enrollments, stats, reload: load };
}

export function AdminAssignmentsPanel({ state }: { state: ReturnType<typeof useAdminAssignments> }) {
  const { loading, assignments, submissions, enrollments, stats, reload } = state;
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");

  const departments = useMemo(
    () => [...new Set(assignments.map((a) => a.courses?.department).filter(Boolean) as string[])].sort(),
    [assignments],
  );

  const q = query.trim().toLowerCase();
  const list = assignments
    .filter((a) => !department || a.courses?.department === department)
    .filter((a) => !q || a.title.toLowerCase().includes(q) || (a.courses?.code ?? "").toLowerCase().includes(q));

  const rowsFor = (a: Asg) => {
    const subs = submissions.filter((s) => s.assignment_id === a.id);
    const expected = enrollments.filter((e) => e.course_id === a.course_id).length;
    const graded = subs.filter((s) => s.score != null).length;
    return { subs, expected, graded, rate: expected ? Math.round((subs.length / expected) * 100) : 0 };
  };

  const byDepartment = useMemo(() => {
    const map = new Map<string, { assignments: number; subs: number; graded: number }>();
    assignments.forEach((a) => {
      const key = a.courses?.department ?? "Unassigned";
      const subs = submissions.filter((s) => s.assignment_id === a.id);
      const cur = map.get(key) ?? { assignments: 0, subs: 0, graded: 0 };
      cur.assignments += 1;
      cur.subs += subs.length;
      cur.graded += subs.filter((s) => s.score != null).length;
      map.set(key, cur);
    });
    return [...map.entries()].sort((a, b) => b[1].assignments - a[1].assignments);
  }, [assignments, submissions]);

  function exportReport() {
    downloadCsv("assignment_report.csv", [
      ["Course", "Assignment", "Department", "Status", "Due date", "Max marks", "Enrolled", "Submissions", "Graded", "Submission rate %"],
      ...list.map((a) => {
        const r = rowsFor(a);
        return [
          a.courses?.code ?? "-", a.title, a.courses?.department ?? "-", a.status,
          a.due_date ? new Date(a.due_date).toLocaleString() : "-", a.max_score,
          r.expected, r.subs.length, r.graded, r.rate,
        ];
      }),
    ]);
  }

  async function moderate(a: Asg) {
    if (!window.confirm(`Remove the attachment on "${a.title}"? Students will no longer be able to download it.`)) return;
    await supabase.from("assignments").update({ attachment_url: null }).eq("id", a.id);
    void reload();
  }

  return (
    <>
      <PageTitle title="Assignments" subtitle="Institution-wide coursework monitoring and reporting." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Total assignments" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Total submissions" value={stats.submissions} />
        <StatCard icon={BarChart3} label="Submission rate" value={`${stats.submissionRate}%`} hint="Against enrolled students" />
        <StatCard icon={BarChart3} label="Grading completion" value={`${stats.gradingRate}%`} />
      </div>

      <div className="mt-6">
        <Panel title="Department comparison">
          {byDepartment.length ? (
            <div className="space-y-3">
              {byDepartment.map(([dept, d]) => {
                const pct = d.subs ? Math.round((d.graded / d.subs) * 100) : 0;
                return (
                  <div key={dept}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{dept}</span>
                      <span className="text-ink-muted">{d.assignments} assignments · {d.subs} submissions · {pct}% graded</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty message="No assignment activity yet." />}
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="All assignments"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${inputClass} h-9 w-full sm:w-44`} value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
                <input className={`${inputClass} h-9 w-full pl-9 sm:w-56`} placeholder="Search course or title"
                  value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button type="button" className={btnGhost} onClick={exportReport}><Download className="size-4" /> Export CSV</button>
            </div>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading assignments…</p>
          ) : list.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3">Course</th><th className="py-2 pr-3">Assignment</th>
                    <th className="py-2 pr-3">Department</th><th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Due</th><th className="py-2 pr-3">Submissions</th>
                    <th className="py-2 pr-3">Graded</th><th className="py-2">Attachment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((a) => {
                    const r = rowsFor(a);
                    return (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-3 font-medium">{a.courses?.code ?? "—"}</td>
                        <td className="py-2.5 pr-3">{a.title}</td>
                        <td className="py-2.5 pr-3 text-ink-muted">{a.courses?.department ?? "—"}</td>
                        <td className="py-2.5 pr-3"><Pill tone={a.status === "published" ? "good" : "muted"}>{a.status}</Pill></td>
                        <td className="py-2.5 pr-3 text-ink-muted">{a.due_date ? new Date(a.due_date).toLocaleDateString() : "—"}</td>
                        <td className="py-2.5 pr-3">{r.subs.length}/{r.expected} <span className="text-ink-muted">({r.rate}%)</span></td>
                        <td className="py-2.5 pr-3">{r.graded}</td>
                        <td className="py-2.5">
                          {a.attachment_url ? (
                            <span className="flex items-center gap-2">
                              <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-brand"
                                onClick={() => void openStoredFile(a.attachment_url!)}>
                                <Paperclip className="size-3" /> {fileLabel(a.attachment_url)}
                              </button>
                              <button type="button" className="text-ink-muted hover:text-flame" title="Remove attachment"
                                onClick={() => void moderate(a)}>
                                <Trash2 className="size-4" />
                              </button>
                            </span>
                          ) : <span className="text-ink-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <Empty message="No assignments match your filters." />}
        </Panel>
      </div>
    </>
  );
}