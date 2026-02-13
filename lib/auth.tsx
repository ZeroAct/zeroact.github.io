"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithGitHub: (nextPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function upsertProfile(user: User) {
  const username =
    (user.user_metadata?.user_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "player";

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const user = session?.user ?? null;

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fire-and-forget profile sync; leaderboard reads use this table.
    void upsertProfile(user);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user,
      signInWithGitHub: async (nextPath = "/") => {
        const origin = window.location.origin;
        const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
        await supabase.auth.signInWithOAuth({
          provider: "github",
          options: {
            redirectTo,
          },
        });
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}

