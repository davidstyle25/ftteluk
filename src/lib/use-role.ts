import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// admin = administrator (akses penuh); admin2 = administrator 2 (sama, tanpa menu RKA & kelola user)
export type AppRole = "admin" | "admin2" | "viewer";

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
        setRole(roles.includes("admin") ? "admin" : roles.includes("admin2") ? "admin2" : "viewer");
      });
  }, [user]);

  return {
    role,
    /** Administrator 1 atau 2: boleh kelola data. */
    isAdmin: role === "admin" || role === "admin2",
    /** Hanya administrator 1: akses penuh (menu RKA, kelola user). */
    isFullAdmin: role === "admin",
  };
}