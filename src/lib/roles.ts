export type AppRole = "student" | "lecturer" | "admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  lecturer: "Lecturer",
  admin: "School Administrator",
};

export const ROLE_HOME: Record<AppRole, string> = {
  student: "/student/dashboard",
  lecturer: "/lecturer/dashboard",
  admin: "/admin/dashboard",
};

export function isAppRole(value: unknown): value is AppRole {
  return value === "student" || value === "lecturer" || value === "admin";
}
