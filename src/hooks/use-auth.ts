import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAppRole, type AppRole } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  institution: string;
  department: string | null;
  matric_number: string | null;
};

export function useAuth() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (id: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, institution, department, matric_number")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
    ]);
    setProfile((p as Profile) ?? null);
    setRole(isAppRole(r?.role) ? (r!.role as AppRole) : null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email ?? null);
        await load(data.user.id);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (session?.user.id) void load(session.user.id);
      else {
        setProfile(null);
        setRole(null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId, load]);

  return { userId, email, profile, role, loading, signOut, refresh };
}