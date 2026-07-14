import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  QrCode,
  BarChart3,
  GraduationCap,
  Users,
  Bell,
  BookOpen,
  Calendar,
  Sparkles,
  ShieldCheck,
  MessagesSquare,
  Building2,
  Check,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import heroCampus from "@/assets/hero-campus.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexCore EdTech — Building Africa's Smart Campuses" },
      {
        name: "description",
        content:
          "The Campus Operating System for African higher institutions: smart attendance, academics, communication, analytics — one unified platform.",
      },
      {
        property: "og:image",
        content:
          "https://id-preview--4d41fe0d-5f1e-4681-953a-2eb01c691653.lovable.app/og-cover.jpg",
      },
    ],
  }),
  component: Home,
});

const whyPoints = [
  { icon: QrCode, title: "Smarter Attendance", desc: "QR, code and geo-verified attendance with pattern insights and at-risk alerts." },
  { icon: GraduationCap, title: "Simplified Administration", desc: "Admissions, registration, results and transcripts — automated end-to-end." },
  { icon: MessagesSquare, title: "Better Communication", desc: "Announcements, direct messaging and role-aware notifications built in." },
  { icon: BarChart3, title: "Academic Analytics", desc: "Real-time dashboards for management, faculties and lecturers." },
  { icon: Sparkles, title: "Modern Experience", desc: "A calm, mobile-first UI students and staff actually enjoy using." },
  { icon: ShieldCheck, title: "One Unified Platform", desc: "Replace 5+ disconnected tools with a single secure system of record." },
];

const audiences = [
  { icon: Users, tag: "For Students", title: "Everything, in one place.", desc: "Timetable, attendance, assignments, results and campus updates on any device." },
  { icon: GraduationCap, tag: "For Lecturers", title: "Teach, don't chase paper.", desc: "Take attendance in seconds, grade faster and monitor engagement in real time." },
  { icon: Building2, tag: "For Administrators", title: "Operations without friction.", desc: "Manage users, faculties and reports across every campus from one console." },
  { icon: BarChart3, tag: "For Management", title: "See the institution clearly.", desc: "Live KPIs on attendance, performance and enrollment to steer better decisions." },
];

const modules = [
  { icon: QrCode, name: "Smart Attendance" },
  { icon: Users, name: "Student Information" },
  { icon: Calendar, name: "Course Registration" },
  { icon: BookOpen, name: "Assignments & CBT" },
  { icon: Calendar, name: "Timetable" },
  { icon: GraduationCap, name: "Results & GPA" },
  { icon: Bell, name: "Notifications" },
  { icon: BarChart3, name: "Analytics Dashboard" },
  { icon: BookOpen, name: "Library" },
  { icon: MessagesSquare, name: "Communication Hub" },
];

function Home() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,oklch(0.34_0.14_258/0.18),transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(50%_50%_at_80%_20%,oklch(0.62_0.15_155/0.15),transparent_70%)]" />
        </div>
        <div className="container-page pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated px-3 py-1 text-xs text-ink-muted">
                <span className="size-1.5 rounded-full bg-emerald" />
                Now onboarding institutions across Africa
              </div>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
                Building Africa's <span className="text-gradient-brand">Smart Campuses</span>.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-muted">
                NexCore is the Campus Operating System that unifies attendance, academics,
                communication and analytics — so institutions run smarter and students thrive.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/demo"
                  className="group inline-flex h-12 items-center gap-2 rounded-full gradient-brand px-6 text-sm font-medium text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5"
                >
                  Request a demo
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/features"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-surface-elevated px-6 text-sm font-medium text-ink hover:border-brand"
                >
                  Explore features
                </Link>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
                {[
                  { k: "10+", v: "Integrated modules" },
                  { k: "95%", v: "Fewer paper forms" },
                  { k: "3×", v: "Faster reporting" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="font-display text-3xl font-semibold text-ink">{s.k}</dt>
                    <dd className="mt-1 text-xs text-ink-muted">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] gradient-brand opacity-20 blur-3xl" />
              <div className="overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-glow">
                <img
                  src={heroCampus}
                  alt="African university campus with students using tablets"
                  width={1600}
                  height={1104}
                  className="h-[420px] w-full object-cover md:h-[560px]"
                />
              </div>
              <div className="absolute -bottom-8 -left-6 hidden w-72 rounded-2xl border border-border bg-surface-elevated p-4 shadow-brand md:block">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-soft text-emerald">
                    <BarChart3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-muted">Attendance today</p>
                    <p className="font-display text-lg font-semibold">92.6% ↑</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[92%] gradient-brand" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED */}
      <section className="border-y border-border bg-surface">
        <div className="container-page py-10">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-ink-muted">
            Trusted by forward-thinking institutions
          </p>
          <div className="mt-6 grid grid-cols-2 items-center gap-x-8 gap-y-6 opacity-70 sm:grid-cols-3 md:grid-cols-6">
            {["Ashford Uni.", "Lagos Poly", "Nile College", "Kano Tech", "Accra Institute", "Dakar Nursing"].map(
              (n) => (
                <div key={n} className="flex items-center justify-center gap-2 text-ink-muted">
                  <div className="size-6 rounded-md gradient-brand" />
                  <span className="font-display text-sm font-semibold tracking-tight">{n}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="container-page py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Why NexCore</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            An operating system, not another portal.
          </h2>
          <p className="mt-4 text-lg text-ink-muted">
            NexCore replaces disconnected registers, spreadsheets and portals with a single
            intelligent platform designed for African higher education.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {whyPoints.map((p) => (
            <div
              key={p.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 transition-colors hover:border-brand"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCES */}
      <section className="bg-surface">
        <div className="container-page py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Built for every role</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Tailored dashboards. One shared truth.
              </h2>
            </div>
            <Link to="/solutions" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:opacity-80">
              See all solutions <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {audiences.map((a) => (
              <article
                key={a.tag}
                className="group relative overflow-hidden rounded-3xl border border-border bg-background p-8 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-ink-muted">
                  <span className="grid size-9 place-items-center rounded-lg gradient-brand text-brand-foreground">
                    <a.icon className="size-4" />
                  </span>
                  {a.tag}
                </div>
                <h3 className="mt-5 font-display text-2xl font-semibold">{a.title}</h3>
                <p className="mt-3 text-ink-muted">{a.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SPOTLIGHT — SMART ATTENDANCE */}
      <section className="container-page py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-6 -z-10 rounded-3xl gradient-brand opacity-20 blur-3xl" />
            <div className="overflow-hidden rounded-3xl border border-border shadow-glow">
              <img
                src={dashboardPreview}
                alt="NexCore analytics dashboard"
                loading="lazy"
                width={1600}
                height={1104}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-flame">Flagship module</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Attendance that does more than take attendance.
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              QR check-ins, session codes and geo-verification feed a real-time engine that
              detects patterns, predicts risk and holds every stakeholder accountable.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Live per-course and per-department attendance rates",
                "Automatic at-risk student alerts to lecturers and advisors",
                "Lecturer punctuality tracking with tamper-proof logs",
                "One-click exports for senate and accreditation reports",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-ink">
                  <span className="mt-0.5 grid size-5 place-items-center rounded-full bg-emerald-soft text-emerald">
                    <Check className="size-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="bg-surface">
        <div className="container-page py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Platform preview</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Ten modules. One elegant system.
            </h2>
            <p className="mt-4 text-ink-muted">
              Every part of campus life connected — from admissions to graduation.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {modules.map((m) => (
              <div
                key={m.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:border-brand"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <m.icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{m.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:border-brand"
            >
              View all features <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container-page py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              q: "NexCore replaced four systems in our first term. Attendance compliance jumped 38%.",
              n: "Prof. A. Bello",
              r: "Vice Chancellor",
            },
            {
              q: "Registration used to take three weeks. We now finish in three days.",
              n: "Mrs. C. Okafor",
              r: "Registrar",
            },
            {
              q: "I can finally see who's struggling before it becomes a problem.",
              n: "Dr. J. Mensah",
              r: "Senior Lecturer",
            },
          ].map((t) => (
            <figure
              key={t.n}
              className="rounded-2xl border border-border bg-surface-elevated p-6"
            >
              <blockquote className="font-display text-lg leading-snug">"{t.q}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full gradient-brand text-brand-foreground text-sm font-semibold">
                  {t.n.split(" ").slice(-1)[0][0]}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.n}</span>
                  <span className="block text-xs text-ink-muted">{t.r}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-brand p-10 text-brand-foreground md:p-16">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-emerald opacity-30 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-flame opacity-25 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Ready to transform your institution?
            </h2>
            <p className="mt-4 text-brand-foreground/80">
              Book a personalized walkthrough. We'll map NexCore to your workflows and show real
              outcomes from institutions like yours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand-foreground px-6 text-sm font-semibold text-brand hover:opacity-90"
              >
                Book a demo <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-brand-foreground/30 px-6 text-sm font-medium hover:bg-brand-foreground/10"
              >
                Contact sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
