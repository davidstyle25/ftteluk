import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppRole = "admin" | "viewer";

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = (data ?? []).map((r) => String(r.role));
        setRole(roles.includes("admin") ? "admin" : "viewer");
      });
  }, [user]);

  return { role, isAdmin: role === "admin" };
}
