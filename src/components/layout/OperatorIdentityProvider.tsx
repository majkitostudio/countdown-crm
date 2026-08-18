"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OperatorIdentity } from "@/lib/operatorIdentity";
import type { Database } from "@/lib/supabase/types";
import { getCurrentWorkspaceContextAction } from "@/app/actions/workspace";

type OperatorProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface OperatorIdentityContextValue {
  identity: OperatorIdentity | null;
  isLoading: boolean;
  error: string | null;
}

const OperatorIdentityContext = createContext<OperatorIdentityContextValue>({
  identity: null,
  isLoading: true,
  error: null,
});

export function OperatorIdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<OperatorIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadIdentity() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (userError || !user) {
        setIdentity(null);
        setError("Authenticated operator profile is unavailable");
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileError) {
        setIdentity(null);
        setError("Operator profile lookup failed");
        setIsLoading(false);
        return;
      }

      const typedProfile = profile as OperatorProfileRow | null;
      let workspaceRole: OperatorIdentity["role"] = null;
      try {
        const workspaceContext = await getCurrentWorkspaceContextAction();
        workspaceRole = workspaceContext.role;
      } catch {
        setIdentity(null);
        setError("Authenticated workspace membership is unavailable");
        setIsLoading(false);
        return;
      }

      setIdentity(
        typedProfile
          ? {
              id: typedProfile.id,
              name: typedProfile.full_name.trim() || "Unknown operator",
              email: typedProfile.email.trim(),
              role: workspaceRole,
              avatarUrl: typedProfile.avatar_url,
            }
          : {
              id: user.id,
              name: "Unknown operator",
              email: user.email || "",
              role: workspaceRole,
              avatarUrl: null,
            }
      );
      setIsLoading(false);
    }

    void loadIdentity();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadIdentity();
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ identity, isLoading, error }),
    [identity, isLoading, error]
  );

  return <OperatorIdentityContext.Provider value={value}>{children}</OperatorIdentityContext.Provider>;
}

export function useOperatorIdentity(): OperatorIdentityContextValue {
  return useContext(OperatorIdentityContext);
}
