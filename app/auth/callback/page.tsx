"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/";
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (error) {
          setMessage("Login failed. You can close this tab and try again.");
          return;
        }
        window.location.replace(next);
      } catch {
        setMessage("Login failed. You can close this tab and try again.");
      }
    };

    void run();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #0b1020, #050814)",
        color: "#e5e7eb",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          width: "100%",
          borderRadius: "16px",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "rgba(2, 6, 23, 0.6)",
          padding: "18px",
        }}
      >
        <div style={{ fontWeight: 900 }}>GitHub Login</div>
        <div style={{ marginTop: "8px", color: "#94a3b8" }}>{message}</div>
      </div>
    </div>
  );
}

