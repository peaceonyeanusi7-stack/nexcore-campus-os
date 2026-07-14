import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import {
  QrCode, Users, Calendar, BookOpen, GraduationCap, Bell,
  BarChart3, MessagesSquare, ShieldCheck, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — NexCore EdTech" },
      { name: "description", content: "Explore every module in the NexCore Campus Operating System: smart attendance, academics, analytics, communication and more." },
      { property: "og:title", content: "Features — NexCore EdTech" },
      { property: "og:description", content: "Ten integrated modules powering Africa's smart campuses." },
    ],
  }),
  component: FeaturesPage,
});

const features = [
  { icon: QrCode, name: "Smart Attendance", desc: "QR, code and geo-verified sessions with pattern insights and risk alerts." },
  { icon: Users, name: "Student Information", desc: "Unified student profiles, records, documents and lifecycle events." },
  { icon: Calendar, name: "Course Registration", desc: "Guided registration with prerequisites, quotas and approvals." },
  { icon: BookOpen, name: "Assignments & CBT", desc: "Author, assign, auto-grade and moderate assessments at scale." },
  { icon: Calendar, name: "Timetable", desc: "Conflict-free scheduling per faculty, room and lecturer." },
  { icon: GraduationCap, name: "Results & GPA", desc: "Grade capture, moderation, GPA computation and transcripts." },
  { icon: Bell, name: "Notifications", desc: "Role-aware announcements, reminders and multi-channel delivery." },
  { icon: BarChart3, name: "Analytics Dashboard", desc: "Real-time KPIs for management, faculty and departments." },
  { icon: BookOpen, name: "Library", desc: "Catalog, reservations and digital resource access." },
  { icon: MessagesSquare, name: "Communication Hub", desc: "Direct messaging between students, lecturers and admin." },
  { icon: ShieldCheck, name: "Access & Security", desc: "SSO, granular roles, audit logs and data residency options." },
  { icon: Sparkles, name: "NexCore AI", desc: "Success predictions, attendance insights and assignment assistance." },
];

function FeaturesPage() {
  return (
    <SiteLayout>
      <PageHeader
        eyebrow="Features"
        title="Everything a modern campus needs, in one system."
        description="Twelve integrated capabilities that replace registers, spreadsheets and disconnected portals with a single elegant platform."
      />
      <section className="container-page py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.name} className="rounded-2xl border border-border bg-surface-elevated p-6 transition-colors hover:border-brand">
              <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <f.icon className="size-5" />
              </div>
              <h2 className="mt-5 font-display text-lg font-semibold">{f.name}</h2>
              <p className="mt-2 text-sm text-ink-muted">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
