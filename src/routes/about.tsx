import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — NexCore EdTech" },
      { name: "description", content: "NexCore EdTech is on a mission to build Africa's Smart Campuses through intelligent, connected, data-driven platforms." },
      { property: "og:title", content: "About — NexCore EdTech" },
      { property: "og:description", content: "Our mission is to build Africa's Smart Campuses." },
    ],
  }),
  component: AboutPage,
});

const values = ["Innovation", "Integrity", "Excellence", "Accessibility", "Collaboration", "Accountability"];

function AboutPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="About"
        title="We're building the operating system for Africa's campuses."
        description="NexCore was founded to close the gap between how African institutions actually work and the fragmented tools they've been forced to use."
      />
      <section className="container-page grid gap-16 py-20 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">Our mission</h2>
          <p className="mt-4 text-ink-muted">
            To empower educational institutions with modern digital tools that simplify
            administration, improve learning experiences, and enable smarter decisions.
          </p>
          <h2 className="mt-12 font-display text-3xl font-semibold">Our vision</h2>
          <p className="mt-4 text-ink-muted">
            A future where every higher institution across Africa operates through an intelligent,
            connected, data-driven digital ecosystem.
          </p>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold">What we value</h2>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {values.map((v) => (
              <li key={v} className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm font-medium">
                {v}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-ink-muted">
            We build with African realities in mind — network variability, mixed devices, tight
            budgets — without compromising on the polish institutions deserve.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
