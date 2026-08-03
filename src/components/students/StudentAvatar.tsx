import { studentInitials } from "@/lib/students";

export function StudentAvatar({
  name,
  photo,
  size = "md",
}: {
  name: string | null | undefined;
  photo?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "size-20 text-xl" : size === "sm" ? "size-9 text-xs" : "size-12 text-sm";
  if (photo) {
    return (
      <img
        src={photo}
        alt={`${name ?? "Student"} profile photo`}
        loading="lazy"
        className={`${dims} shrink-0 rounded-2xl border border-border object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${dims} grid shrink-0 place-items-center rounded-2xl bg-brand-soft font-display font-semibold text-brand`}
    >
      {studentInitials(name)}
    </span>
  );
}