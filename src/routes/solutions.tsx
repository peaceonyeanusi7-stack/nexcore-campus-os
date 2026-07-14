import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions — NexCore EdTech" },
      { name: "description", content: "Tailored solutions for universities, polytechnics, colleges, nursing schools and vocational institutes across Africa." },
      { property: "og:title", content: "Solutions — NexCore EdTech" },
      { property: "og:description", content: "Purpose-built for every kind of higher institution." },
    ],
  }),
  component: SolutionsPage,
});

const solutions = [
  { name: "Universities", challenge: "Fragmented systems across faculties and campuses.", how: "Unified academic management, senate reporting and analytics.", outcome: "Faster decisions, stronger accreditation posture." },
  { name: "Polytechnics", challenge: "Complex practical + theory scheduling and grading.", how: "Timetable engine and modular assessments tailored to practicals.", outcome: "Higher completion and clearer student progress." },
  { name: "Colleges of Education", challenge: "Teaching-practice tracking and placement management.", how: "Attendance for off-site sessions and mentor workflows.", outcome: "Accurate practice records and improved placement outcomes." },
  { name: "Nursing Schools", challenge: "Clinical rotations and rigorous attendance rules.", how: "Rotation-aware attendance with tamper-proof geo logs.", outcome: "Regulatory compliance and better clinical exposure." },
  { name: "Health Technology Schools", challenge: "Lab utilisation and safety compliance.", how: "Lab scheduling, resource booking and compliance reports.", outcome: "Safer labs and higher throughput." },
  { name: "Vocational Institutes", challenge: "Short cycles, high enrolment churn.", how: "Fast onboarding, cohort management and certification workflows.", outcome: "Scale without operational overhead." },
];

function SolutionsPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Solutions"
        title="Purpose-built for every kind of institution."
        description="From flagship universities to specialised training centres, NexCore adapts to the way your campus actually operates."
      />
      <section className="container-page py-20">
        <div className="grid gap-6 md:grid-cols-2">
          {solutions.map((s) => (
            <article key={s.name} className="rounded-3xl border border-border bg-surface-elevated p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl gradient-brand text-brand-foreground">
                  <Building2 className="size-5" />
                </span>
                <h2 className="font-display text-2xl font-semibold">{s.name}</h2>
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                <div><dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Challenge</dt><dd className="mt-1 text-ink">{s.challenge}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-widest text-brand">How NexCore helps</dt><dd className="mt-1 text-ink">{s.how}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-widest text-emerald">Outcome</dt><dd className="mt-1 text-ink">{s.outcome}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
