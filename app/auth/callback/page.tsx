"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const next = url.searchParams.get("next") || "/";

        const errorParam = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        if (errorParam) {
          setMessage("Login failed.");
          setDetails(
            `Provider error: ${errorParam}${errorDescription ? `\n${errorDescription}` : ""}`
          );
          return;
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        url.searchParams.delete("next");

        if (!code || !state) {
          setMessage("Login failed.");
          setDetails(
            `Missing OAuth params.\ncode present: ${Boolean(code)}\nstate present: ${Boolean(state)}\nURL: ${window.location.href}`
          );
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(url.toString());
        if (error) {
          setMessage("Login failed.");
          setDetails(
            `Supabase exchange error: ${error.message}\nHint: this often happens if you started login on one domain and the callback landed on another, or if the Redirect URL isn't allowlisted in Supabase.\nURL: ${window.location.href}`
          );
          return;
        }
        window.location.replace(next);
      } catch {
        setMessage("Login failed.");
        setDetails(`Unexpected error.\nURL: ${window.location.href}`);
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
        {details && (
          <pre
            style={{
              marginTop: "10px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#cbd5e1",
              fontSize: "12px",
              lineHeight: 1.4,
              background: "rgba(15, 23, 42, 0.65)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: "12px",
              padding: "10px",
            }}
          >
            {details}
          </pre>
        )}
      </div>
    </div>
  );
}
