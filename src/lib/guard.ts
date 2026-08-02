import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAppRole, ROLE_HOME, type AppRole } from "@/lib/roles";

/** Client-only route guard: requires a session AND the given role. */
export async function requireRole(role: AppRole) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/login" });

  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const actual = isAppRole(row?.role) ? (row!.role as AppRole) : null;
  if (!actual) throw redirect({ to: "/login" });
  if (actual !== role) throw redirect({ to: ROLE_HOME[actual] });

  return { userId: data.user.id, role: actual };
}