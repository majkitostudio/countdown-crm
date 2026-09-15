"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isDemoAuthEnabled } from "@/lib/auth/config";
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

export function OperatorIdentityProvider({
  children,
  initialIdentity = null,
}: {
  children: React.ReactNode;
  initialIdentity?: OperatorIdentity | null;
}) {
  const [identity, setIdentity] = useState<OperatorIdentity | null>(initialIdentity);
  const [isLoading, setIsLoading] = useState(!initialIdentity);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadIdentity() {
      if (!initialIdentity) setIsLoading(true);
      setError(null);

      if (isDemoAuthEnabled()) {
        setIdentity({
          id: "demo-user",
          name: "Demo Administrator",
          email: "demo@countdowncrm.local",
          role: "administrator",
          avatarUrl: null,
        });
        setIsLoading(false);
        return;
      }

      let workspaceContext: Awaited<ReturnType<typeof getCurrentWorkspaceContextAction>>;
      try {
        workspaceContext = await getCurrentWorkspaceContextAction();
      } catch {
        setError("Authenticated workspace membership is unavailable");
        setIsLoading(false);
        return;
      }

      if (cancelled) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      let typedProfile: OperatorProfileRow | null = null;
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError) typedProfile = profile as OperatorProfileRow | null;
      }

      setIdentity(
        typedProfile
          ? {
              id: typedProfile.id,
              name: typedProfile.full_name.trim() || "Unknown operator",
              email: typedProfile.email.trim(),
              role: workspaceContext.role,
              avatarUrl: typedProfile.avatar_url,
            }
          : {
              id: workspaceContext.userId,
              name: user?.user_metadata?.full_name || "Unknown operator",
              email: user?.email || "",
              role: workspaceContext.role,
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
  }, [initialIdentity]);

  const value = useMemo(
    () => ({ identity, isLoading, error }),
    [identity, isLoading, error]
  );

  return <OperatorIdentityContext.Provider value={value}>{children}</OperatorIdentityContext.Provider>;
}

export function useOperatorIdentity(): OperatorIdentityContextValue {
  return useContext(OperatorIdentityContext);
}
