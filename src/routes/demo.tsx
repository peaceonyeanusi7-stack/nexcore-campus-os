import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Request a demo — NexCore EdTech" },
      { name: "description", content: "Book a personalized walkthrough of the NexCore Campus Operating System with our team." },
      { property: "og:title", content: "Request a NexCore demo" },
      { property: "og:description", content: "See NexCore in action, mapped to your institution's workflows." },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Request a demo"
        title="See NexCore, tailored to your institution."
        description="Share a few details and our team will schedule a personalized walkthrough within one business day."
      />
      <section className="container-page py-20">
        <div className="mx-auto max-w-3xl">
          {submitted ? (
            <div className="rounded-3xl border border-border bg-surface-elevated p-12 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald" />
              <h2 className="mt-4 font-display text-3xl font-semibold">You're on the list.</h2>
              <p className="mt-3 text-ink-muted">
                Our team will contact you shortly to schedule your personalized NexCore demonstration.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-5 rounded-3xl border border-border bg-surface-elevated p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Institution name" name="institution" />
                <Field label="Contact person" name="name" />
                <Field label="Role" name="role" />
                <Field label="Work email" name="email" type="email" />
                <Field label="Phone number" name="phone" />
                <Field label="Institution type" name="type" placeholder="University, Polytechnic…" />
                <Field label="Number of students" name="students" type="number" />
                <Field label="Preferred demo date" name="date" type="date" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-widest text-ink-muted">Additional information</label>
                <textarea rows={4} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-brand" />
              </div>
              <button className="inline-flex h-12 items-center rounded-full gradient-brand px-8 text-sm font-semibold text-brand-foreground shadow-brand">
                Request my demo
              </button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, name, type = "text", placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-medium uppercase tracking-widest text-ink-muted">{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand" />
    </div>
  );
}
