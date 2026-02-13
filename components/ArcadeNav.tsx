"use client";

import Link from "next/link";

export default function ArcadeNav({
  title = "ZeroAct Arcade",
}: {
  title?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "16px",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background:
          "linear-gradient(180deg, rgba(15, 23, 42, 0.70), rgba(2, 6, 23, 0.55))",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            // If the user landed directly on this page, "Back" can be a no-op.
            if (window.history.length > 1) window.history.back();
            else window.location.href = "/";
          }}
          style={{
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "rgba(148, 163, 184, 0.10)",
            color: "#e5e7eb",
            borderRadius: "12px",
            padding: "8px 10px",
            fontSize: "13px",
            fontWeight: 900,
            cursor: "pointer",
          }}
          title="Back"
        >
          Back
        </button>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            color: "#e5e7eb",
            fontWeight: 950,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Link>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Link
          href="/"
          style={{
            textDecoration: "none",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "rgba(148, 163, 184, 0.10)",
            color: "#e5e7eb",
            borderRadius: "999px",
            padding: "8px 12px",
            fontSize: "13px",
            fontWeight: 900,
          }}
        >
          Home
        </Link>
        <div
          aria-hidden
          style={{
            height: "10px",
            width: "120px",
            borderRadius: "999px",
            background:
              "linear-gradient(90deg, rgba(34, 197, 94, 0.55), rgba(96, 165, 250, 0.55))",
            filter: "blur(0.2px)",
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}
