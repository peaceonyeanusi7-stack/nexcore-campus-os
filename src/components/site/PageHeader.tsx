export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="container-page py-20 md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-muted">{description}</p>
      </div>
    </section>
  );
}
