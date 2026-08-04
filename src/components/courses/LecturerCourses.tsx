import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, Loader2, Users, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, Panel, StatCard, Empty, Pill, inputClass, btnGhost } from "@/components/dashboard/kit";
import { downloadCsv, type Course } from "@/lib/courses";

type Row = {
  id: string; course_id: string; student_id: string; session: string; semester: string;
  registration_date: string; status: string;
};
type StudentRow = { auth_user_id: string | null; student_id: string; full_name: string; email: string; department: string | null; level: string | null };

export function useLecturerCourses(lecturerId: string | null) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const load = useCallback(async () => {
    if (!lecturerId) return;
    setLoading(true);
    const { data: cs } = await supabase.from("courses").select("*").eq("lecturer_id", lecturerId).order("code");
    const ids = (cs ?? []).map((c) => c.id);
    const [regs, st] = await Promise.all([
      ids.length
        ? supabase.from("course_registrations").select("id, course_id, student_id, session, semester, registration_date, status").in("course_id", ids)
        : Promise.resolve({ data: [] as Row[] }),
      supabase.from("students").select("auth_user_id, student_id, full_name, email, department, level"),
    ]);
    setCourses((cs as Course[]) ?? []);
    setRows((regs.data as Row[]) ?? []);
    setStudents((st.data as StudentRow[]) ?? []);
    setLoading(false);
  }, [lecturerId]);

  useEffect(() => { void load(); }, [load]);

  return { loading, courses, rows, students, reload: load };
}

export function LecturerCoursesPanel({ state }: { state: ReturnType<typeof useLecturerCourses> }) {
  const { loading, courses, rows, students } = state;
  const [query, setQuery] = useState("");

  const byId = useMemo(() => {
    const map = new Map<string, StudentRow>();
    students.forEach((s) => { if (s.auth_user_id) map.set(s.auth_user_id, s); });
    return map;
  }, [students]);

  const q = query.trim().toLowerCase();

  function exportList(course: Course, list: Row[]) {
    downloadCsv(`${course.code.replace(/\s+/g, "_")}_class_list.csv`, [
      ["S/N", "Matric No", "Full name", "Email", "Department", "Level", "Registered on"],
      ...list.map((r, i) => {
        const s = byId.get(r.student_id);
        return [
          i + 1, s?.student_id ?? "-", s?.full_name ?? "Student", s?.email ?? "-",
          s?.department ?? "-", s?.level ?? "-", new Date(r.registration_date).toDateString(),
        ];
      }),
    ]);
  }

  return (
    <>
      <PageTitle title="My courses & class lists" subtitle="Students registered for the courses assigned to you." />
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={BookOpen} label="Assigned courses" value={courses.length} />
        <StatCard icon={Users} label="Total enrolled students" value={new Set(rows.map((r) => r.student_id)).size} />
      </div>
      <div className="mt-6">
        <Panel
          title="Search enrolled students"
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input className={`${inputClass} h-9 w-full pl-9 sm:w-64`} placeholder="Name, matric no or email"
                value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading class lists…</p>
          ) : courses.length ? (
            <div className="space-y-6">
              {courses.map((c) => {
                const list = rows.filter((r) => r.course_id === c.id).filter((r) => {
                  if (!q) return true;
                  const s = byId.get(r.student_id);
                  return [s?.full_name, s?.student_id, s?.email].some((v) => (v ?? "").toLowerCase().includes(q));
                });
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{c.code} — {c.title}</p>
                        <p className="text-xs text-ink-muted">{c.units} units · {c.level ?? "All levels"} · {c.department ?? "General"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill>{list.length} students</Pill>
                        <button type="button" className={btnGhost} disabled={!list.length} onClick={() => exportList(c, list)}>
                          <Download className="size-4" /> Export CSV
                        </button>
                      </div>
                    </div>
                    {list.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                              <th className="py-2 pr-3">Matric no</th><th className="py-2 pr-3">Name</th>
                              <th className="py-2 pr-3">Level</th><th className="py-2 pr-3">Email</th>
                              <th className="py-2">Registered</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {list.map((r) => {
                              const s = byId.get(r.student_id);
                              return (
                                <tr key={r.id}>
                                  <td className="py-2.5 pr-3 font-medium">{s?.student_id ?? "—"}</td>
                                  <td className="py-2.5 pr-3">{s?.full_name ?? "Student"}</td>
                                  <td className="py-2.5 pr-3">{s?.level ?? "—"}</td>
                                  <td className="py-2.5 pr-3 text-ink-muted">{s?.email ?? "—"}</td>
                                  <td className="py-2.5">{new Date(r.registration_date).toDateString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : <Empty message={q ? "No student matches your search in this course." : "No students registered yet."} />}
                  </div>
                );
              })}
            </div>
          ) : <Empty message="No courses assigned to you yet." />}
        </Panel>
      </div>
    </>
  );
}
