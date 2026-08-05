import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, User, GraduationCap, Users, BookOpen, Wallet, QrCode,
  BarChart3, Settings, Loader2, CheckCircle2, Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireRole } from "@/lib/guard";
import { useAuth } from "@/hooks/use-auth";
import { DashboardShell, type DashboardSection } from "@/components/dashboard/DashboardShell";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { PageTitle, Panel, StatCard, Empty, Rows, Row, Pill, Field, inputClass, btnPrimary, btnGhost } from "@/components/dashboard/kit";
import { StudentManager } from "@/components/students/StudentManager";
import { useAdminCourses, AdminCoursesPanel } from "@/components/courses/AdminCourses";
import { useAdminAttendance, AdminAttendancePanel } from "@/components/attendance/AdminAttendance";
import type { Student } from "@/lib/students";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({
    meta: [
      { title: "Administrator Dashboard — NexCore Campus OS" },
      { name: "description", content: "Manage students, lecturers, courses, fees, analytics and school settings." },
    ],
  }),
  component: AdminDashboard,
});

const sections: DashboardSection[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "profile", label: "Profile", icon: User },
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "lecturers", label: "Lecturers", icon: Users },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "attendance", label: "Attendance", icon: QrCode },
  { key: "fees", label: "Fees", icon: Wallet },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "School settings", icon: Settings },
];

function AdminDashboard() {
  const { profile, role, signOut, refresh } = useAuth();
  const [active, setActive] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [studentRows, setStudentRows] = useState<Student[]>([]);
  const courseState = useAdminCourses();
  const attState = useAdminAttendance();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [p, r, c, e, f, a, rs, i, st] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, institution, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("courses").select("id, code, title, units, level, lecturer_id"),
      supabase.from("enrollments").select("id, course_id, student_id"),
      supabase.from("fees").select("id, student_id, description, amount_kobo, status, due_date").order("due_date", { ascending: true }),
      supabase.from("attendance_records").select("id, status"),
      supabase.from("results").select("id, score"),
      supabase.from("institutions").select("id, name, slug, country, onboarding_status"),
      supabase.from("students").select("*").order("created_at", { ascending: false }),
    ]);
    setPeople(p.data ?? []); setRoles(r.data ?? []); setCourses(c.data ?? []);
    setEnrollments(e.data ?? []); setFees(f.data ?? []); setAttendance(a.data ?? []);
    setResults(rs.data ?? []); setInstitutions(i.data ?? []);
    setStudentRows((st.data as Student[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);
  function flash(t: string) { setMsg(t); void loadAll(); }

  const roleOf = (id: string) => roles.find((r) => r.user_id === id)?.role ?? "student";
  const students = people.filter((p) => roleOf(p.id) === "student");
  const lecturers = people.filter((p) => roleOf(p.id) === "lecturer");
  const paid = fees.filter((f) => f.status === "paid");
  const revenue = paid.reduce((s, f) => s + Number(f.amount_kobo ?? 0) / 100, 0);
  const outstanding = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + Number(f.amount_kobo ?? 0) / 100, 0);
  const presentRate = attendance.length
    ? Math.round((attendance.filter((a) => a.status === "present").length / attendance.length) * 100) : 0;
  const avgScore = results.length
    ? Math.round(results.reduce((s, r) => s + Number(r.score ?? 0), 0) / results.length) : 0;

  if (!role) return <Loading />;

  return (
    <DashboardShell
      role="admin"
      name={profile?.full_name ?? ""}
      institution={profile?.institution ?? ""}
      sections={sections}
      active={active}
      onSelect={(k) => { setActive(k); setMsg(null); }}
      onSignOut={signOut}
    >
      {msg ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald-soft px-4 py-2.5 text-sm text-emerald">
          <CheckCircle2 className="size-4" /> {msg}
        </p>
      ) : null}
      {loading ? <Loading /> : null}

      {active === "overview" && (
        <>
          <PageTitle title="Institution overview" subtitle="Live snapshot of your campus operations." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={GraduationCap} label="Students" value={studentRows.length} hint={`${studentRows.filter((s) => s.status === "active").length} active`} />
            <StatCard icon={Users} label="Lecturers" value={lecturers.length} />
            <StatCard icon={BookOpen} label="Courses" value={courseState.courses.length} hint={`${courseState.registrations.length} registrations`} />
            <StatCard icon={Wallet} label="Fees collected" value={`₦${revenue.toLocaleString()}`} hint={`₦${outstanding.toLocaleString()} outstanding`} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel title="Newest members">
              {people.length ? (
                <Rows>
                  {people.slice(0, 6).map((p) => (
                    <Row key={p.id}>
                      <span><span className="font-medium">{p.full_name ?? "Unnamed"}</span> <span className="block text-xs text-ink-muted">{p.email}</span></span>
                      <Pill>{roleOf(p.id)}</Pill>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No members yet." />}
            </Panel>
            <Panel title="Key indicators">
              <Rows>
                <Row><span>Attendance rate</span><Pill tone="good">{presentRate}%</Pill></Row>
                <Row><span>Average score</span><Pill tone="good">{avgScore}</Pill></Row>
                <Row><span>Course registrations</span><Pill>{courseState.registrations.length}</Pill></Row>
                <Row>
                  <span>Registration period</span>
                  <Pill tone={courseState.activePeriod ? "good" : "warn"}>
                    {courseState.activePeriod ? `${courseState.activePeriod.session} · ${courseState.activePeriod.semester}` : "Not set"}
                  </Pill>
                </Row>
                <Row><span>Institutions onboarded</span><Pill>{institutions.length}</Pill></Row>
              </Rows>
            </Panel>
          </div>
        </>
      )}

      {active === "profile" && <ProfilePanel onSaved={refresh} />}

      {active === "students" && (
        <StudentManager students={studentRows} loading={loading} onChanged={flash} />
      )}

      {active === "lecturers" && (
        <>
          <PageTitle title="Manage lecturers" subtitle="Assign teaching staff and review their load." />
          <Panel title={`${lecturers.length} lecturers`}>
            {lecturers.length ? (
              <Rows>
                {lecturers.map((l) => (
                  <PersonRow key={l.id} person={l} currentRole="lecturer" onDone={() => flash("Role updated.")} enrolled={courses.filter((c) => c.lecturer_id === l.id).length} suffix="courses" />
                ))}
              </Rows>
            ) : <Empty message="No lecturers yet." />}
          </Panel>
        </>
      )}

      {active === "courses" && (
        <AdminCoursesPanel state={courseState} lecturers={lecturers} />
      )}

      {active === "attendance" && <AdminAttendancePanel state={attState} />}

      {active === "fees" && (
        <>
          <PageTitle title="Manage fees" subtitle="Invoice students today; Paystack subscriptions plug in later." />
          <Panel title="Create invoice">
            <FeeForm students={students} onDone={() => flash("Invoice created.")} />
          </Panel>
          <div className="mt-6">
            <Panel title="Invoices" action={<Pill tone="good">₦{revenue.toLocaleString()} collected</Pill>}>
              {fees.length ? (
                <Rows>
                  {fees.map((f) => (
                    <Row key={f.id}>
                      <span>{people.find((p) => p.id === f.student_id)?.full_name ?? "Student"} · {f.description}
                        <span className="block text-xs text-ink-muted">₦{(Number(f.amount_kobo ?? 0) / 100).toLocaleString()} · due {f.due_date ? new Date(f.due_date).toDateString() : "—"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Pill tone={f.status === "paid" ? "good" : "warn"}>{f.status}</Pill>
                        {f.status !== "paid" ? (
                          <button type="button" className={btnGhost} onClick={async () => { await supabase.from("fees").update({ status: "paid" }).eq("id", f.id); flash("Marked as paid."); }}>Mark paid</button>
                        ) : null}
                      </span>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No invoices yet." />}
            </Panel>
          </div>
        </>
      )}

      {active === "analytics" && (
        <>
          <PageTitle title="Analytics" subtitle="Operational health across attendance, academics and finance." />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BarChart3} label="Attendance rate" value={`${presentRate}%`} hint={`${attendance.length} check-ins`} />
            <StatCard icon={GraduationCap} label="Average score" value={avgScore} hint={`${results.length} results`} />
            <StatCard icon={BookOpen} label="Avg. students per course" value={courses.length ? Math.round(enrollments.length / courses.length) : 0} />
            <StatCard icon={Wallet} label="Collection rate" value={`${fees.length ? Math.round((paid.length / fees.length) * 100) : 0}%`} />
          </div>
          <div className="mt-6">
            <Panel title="Enrolment by course">
              {courses.length ? (
                <div className="space-y-3">
                  {courses.map((c) => {
                    const n = enrollments.filter((e) => e.course_id === c.id).length;
                    const pct = enrollments.length ? Math.round((n / enrollments.length) * 100) : 0;
                    return (
                      <div key={c.id}>
                        <div className="mb-1 flex justify-between text-sm"><span>{c.code}</span><span className="text-ink-muted">{n}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full gradient-brand" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <Empty message="No data yet." />}
            </Panel>
          </div>
        </>
      )}

      {active === "settings" && (
        <>
          <PageTitle title="School settings" subtitle="Onboard your institution profile." />
          <Panel title="Add institution">
            <InstitutionForm onDone={() => flash("Institution saved.")} />
          </Panel>
          <div className="mt-6">
            <Panel title="Institutions">
              {institutions.length ? (
                <Rows>
                  {institutions.map((i) => (
                    <Row key={i.id}>
                      <span className="flex items-center gap-2"><Building2 className="size-4 text-brand" /> {i.name}
                        <span className="block text-xs text-ink-muted">{i.country ?? "—"} · {i.onboarding_status}</span>
                      </span>
                      <Pill>{i.slug}</Pill>
                    </Row>
                  ))}
                </Rows>
              ) : <Empty message="No institutions onboarded yet." />}
            </Panel>
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function Loading() {
  return <div className="flex items-center gap-2 py-10 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" /> Loading…</div>;
}

function PersonRow({ person, currentRole, onDone, enrolled, suffix = "courses" }: any) {
  const [busy, setBusy] = useState(false);
  return (
    <Row>
      <span>
        <span className="font-medium">{person.full_name ?? "Unnamed"}</span>
        <span className="block text-xs text-ink-muted">{person.email} · {person.institution ?? "No institution"}</span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Pill>{enrolled} {suffix}</Pill>
        <select
          className={`${inputClass} h-9 w-36`}
          value={currentRole}
          disabled={busy}
          onChange={async (e) => {
            setBusy(true);
            await supabase.from("user_roles").delete().eq("user_id", person.id);
            await supabase.from("user_roles").insert({ user_id: person.id, role: e.target.value as any });
            setBusy(false);
            onDone();
          }}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Administrator</option>
        </select>
      </span>
    </Row>
  );
}

function AdminCourseForm({ lecturers, onDone }: any) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [units, setUnits] = useState("3");
  const [lecturerId, setLecturerId] = useState("");
  return (
    <form
      className="grid gap-4 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("courses").insert({ code, title, units: Number(units), lecturer_id: lecturerId || null });
        setCode(""); setTitle("");
        onDone();
      }}
    >
      <Field label="Code"><input required className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="GST 101" /></Field>
      <Field label="Title"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Units"><input type="number" min="1" className={inputClass} value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
      <Field label="Lecturer">
        <select className={inputClass} value={lecturerId} onChange={(e) => setLecturerId(e.target.value)}>
          <option value="">Unassigned</option>
          {lecturers.map((l: any) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
        </select>
      </Field>
      <button type="submit" className={btnPrimary}>Create course</button>
    </form>
  );
}

function FeeForm({ students, onDone }: any) {
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  return (
    <form
      className="grid gap-4 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("fees").insert({ student_id: studentId, description: title, amount_kobo: Math.round(Number(amount) * 100), due_date: due || null });
        setTitle(""); setAmount("");
        onDone();
      }}
    >
      <Field label="Student">
        <select required className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">Select student</option>
          {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
        </select>
      </Field>
      <Field label="Description"><input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tuition — First semester" /></Field>
      <Field label="Amount (₦)"><input required type="number" min="0" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Due date"><input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      <button type="submit" className={btnPrimary}>Create invoice</button>
    </form>
  );
}

function InstitutionForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Nigeria");
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await supabase.from("institutions").insert({
          name,
          country,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        });
        setName("");
        onDone();
      }}
    >
      <Field label="Institution name"><input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Country"><input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" /></Field>
      <button type="submit" className={btnPrimary}>Save institution</button>
    </form>
  );
}
