import AuthButton from "@/components/AuthButton";
import ArcadeNav from "@/components/ArcadeNav";
import RequestsBoard from "@/components/RequestsBoard";

export default function RequestNewPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px circle at 20% 10%, rgba(34, 197, 94, 0.18), transparent 55%), radial-gradient(900px circle at 80% 15%, rgba(96, 165, 250, 0.18), transparent 55%), linear-gradient(180deg, #0b1020, #050814)",
        color: "#e5e7eb",
        padding: "clamp(18px, 3vw, 32px)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto", display: "grid", gap: "18px" }}>
        <ArcadeNav title="Requests" />
        <header style={{ display: "grid", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: "4px" }}>
              <h1 style={{ margin: 0, letterSpacing: "-0.04em" }}>New Request</h1>
              <div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.4 }}>
                Submit a feature request (login required).
              </div>
            </div>
            <AuthButton nextPath="/requests/new/" />
          </div>
        </header>

        <RequestsBoard mode="create" />
      </div>
    </div>
  );
}

