import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NexCore EdTech" },
      { name: "description", content: "Flexible plans for small institutions, growing polytechnics and large multi-campus universities." },
      { property: "og:title", content: "Pricing — NexCore EdTech" },
      { property: "og:description", content: "Simple, transparent pricing built for institutions of every size." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  { name: "Starter", tag: "For small institutions", features: ["Up to 1,000 students", "Attendance + academics", "Standard reports", "Email support"], cta: "Talk to sales" },
  { name: "Professional", tag: "For growing institutions", features: ["Up to 10,000 students", "All modules", "Advanced analytics", "Priority support", "SSO"], cta: "Book a demo", featured: true },
  { name: "Enterprise", tag: "For universities & multi-campus", features: ["Unlimited students", "Multi-campus + faculties", "Custom AI insights", "Dedicated success manager", "Data residency options"], cta: "Contact sales" },
];

function PricingPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Pricing"
        title="Plans that grow with your institution."
        description="Transparent tiers scoped to institution size. Detailed quotes are tailored to student count, modules and rollout scope."
      />
      <section className="container-page py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <article
              key={p.name}
              className={`relative rounded-3xl border p-8 ${
                p.featured
                  ? "border-brand bg-brand text-brand-foreground shadow-brand"
                  : "border-border bg-surface-elevated"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-flame px-3 py-1 text-xs font-semibold text-flame-foreground">
                  Most popular
                </span>
              )}
              <p className={`text-xs uppercase tracking-widest ${p.featured ? "text-brand-foreground/70" : "text-ink-muted"}`}>{p.tag}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">{p.name}</h2>
              <p className={`mt-4 text-sm ${p.featured ? "text-brand-foreground/80" : "text-ink-muted"}`}>
                Custom pricing based on institution size and modules.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`mt-0.5 size-4 ${p.featured ? "text-brand-foreground" : "text-emerald"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/demo"
                className={`mt-8 inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-semibold ${
                  p.featured
                    ? "bg-brand-foreground text-brand hover:opacity-90"
                    : "gradient-brand text-brand-foreground"
                }`}
              >
                {p.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
