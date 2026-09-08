import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — NexCore EdTech" },
      { name: "description", content: "Talk to the NexCore team about bringing the Campus Operating System to your institution." },
      { property: "og:title", content: "Contact NexCore" },
      { property: "og:description", content: "Let's discuss your institution's digital transformation." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Contact"
        title="Let's discuss your institution's digital transformation."
        description="Reach the NexCore team directly — we typically reply within one business day."
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          {[
            { icon: Mail, label: "Email", value: "peaceonyeanusi7@gmail.com" },
            { icon: Phone, label: "Phone", value: "+234 901 868 7197" },
            { icon: MapPin, label: "Office", value: "Enugu, Nigeria" },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-4 rounded-2xl border border-border bg-surface-elevated p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><c.icon className="size-5" /></span>
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-muted">{c.label}</p>
                <p className="mt-1 font-medium">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          className="space-y-4 rounded-3xl border border-border bg-surface-elevated p-8"
          onSubmit={(e) => { e.preventDefault(); alert("Thanks — we'll be in touch shortly."); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" />
            <Field label="Work email" name="email" type="email" />
          </div>
          <Field label="Institution" name="institution" />
          <Field label="Role" name="role" />
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-ink-muted">Message</label>
            <textarea name="message" rows={5} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-brand" />
          </div>
          <button className="inline-flex h-11 items-center rounded-full gradient-brand px-6 text-sm font-semibold text-brand-foreground">
            Send message
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-xs font-medium uppercase tracking-widest text-ink-muted">{label}</label>
      <input id={name} name={name} type={type} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand" />
    </div>
  );
}
