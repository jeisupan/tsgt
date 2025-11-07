import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "super_admin" | "admin" | "sales" | "inventory" | "finance" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setAccountId(null);
        setLoading(false);
        return;
      }

      // Fetch user profile to get account_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .maybeSingle();

      setAccountId((profile as any)?.account_id || null);

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } else {
        setRole(data?.role as UserRole);
      }
      
      setLoading(false);
    };

    fetchUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasAccess = (allowedRoles: UserRole[]) => {
    return role && allowedRoles.includes(role);
  };

  const canEdit = (module: string) => {
    if (role === "super_admin" || role === "admin") return true;
    if (module === "inventory" && role === "finance") return false;
    if (module === "orders" && role === "finance") return false;
    return true;
  };

  return { role, loading, hasAccess, canEdit, accountId };
};
