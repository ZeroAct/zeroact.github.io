"use client";

import { useAuth } from "@/lib/auth";

export default function AuthButton({ nextPath }: { nextPath?: string }) {
  const { loading, user, signInWithGitHub, signOut } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          color: "#cbd5e1",
          background: "rgba(148, 163, 184, 0.12)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "999px",
          padding: "8px 12px",
          fontSize: "13px",
          fontWeight: 800,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signInWithGitHub(nextPath)}
        style={{
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "rgba(148, 163, 184, 0.12)",
          color: "#e2e8f0",
          borderRadius: "999px",
          padding: "8px 12px",
          fontSize: "13px",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Login with GitHub
      </button>
    );
  }

  const username =
    (user.user_metadata?.user_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "player";

  return (
    <button
      type="button"
      onClick={() => signOut()}
      style={{
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(148, 163, 184, 0.12)",
        color: "#e2e8f0",
        borderRadius: "999px",
        padding: "8px 12px",
        fontSize: "13px",
        fontWeight: 900,
        cursor: "pointer",
      }}
      title="Sign out"
    >
      {username} (Sign out)
    </button>
  );
}

