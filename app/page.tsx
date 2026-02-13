import Link from "next/link";

type Game = {
  title: string;
  href: string;
  description: string;
  meta: string;
  accent: string;
};

const GAMES: Game[] = [
  {
    title: "Tetris Sprint",
    href: "/tetris",
    description: "Fast, clean Tetris with keyboard and touch controls.",
    meta: "1 player",
    accent: "#22c55e",
  },
];

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={game.href}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
    >
      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background:
            "linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.92))",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          transition: "transform 120ms ease, border-color 120ms ease",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-1px",
            background: `radial-gradient(600px circle at 18% 22%, ${game.accent}2b, transparent 60%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ padding: "18px 18px 16px", position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                aria-hidden
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: game.accent,
                  boxShadow: `0 0 0 4px ${game.accent}18`,
                }}
              />
              <div style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "-0.02em" }}>
                {game.title}
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#cbd5e1",
                background: "rgba(148, 163, 184, 0.12)",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: "999px",
                padding: "6px 10px",
                whiteSpace: "nowrap",
              }}
            >
              {game.meta}
            </div>
          </div>
          <div style={{ marginTop: "10px", color: "#94a3b8", lineHeight: 1.4 }}>
            {game.description}
          </div>
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "13px", color: "#e2e8f0", fontWeight: 800 }}>
              Play
            </div>
            <div
              aria-hidden
              style={{
                fontSize: "13px",
                color: "#94a3b8",
                fontWeight: 800,
              }}
            >
              {"->"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px circle at 20% 10%, rgba(34, 197, 94, 0.25), transparent 55%), radial-gradient(900px circle at 80% 15%, rgba(96, 165, 250, 0.22), transparent 55%), linear-gradient(180deg, #0b1020, #050814)",
        color: "#e5e7eb",
        padding: "clamp(18px, 3vw, 32px)",
        fontFamily: "var(--font-geist-sans)",
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <header style={{ padding: "10px 0 18px", display: "grid", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(30px, 4.2vw, 54px)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              ZeroAct Arcade
            </h1>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <a
                href="https://github.com/ZeroAct/zeroact.github.io"
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none",
                  color: "#e2e8f0",
                  background: "rgba(148, 163, 184, 0.12)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: "999px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                GitHub
              </a>
            </div>
          </div>
          <p style={{ margin: 0, color: "#a1a1aa", maxWidth: "70ch" }}>
            A growing shelf of small games. This page is the hub, and new cards can be added as games
            ship.
          </p>
        </header>

        <main style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "16px",
              alignItems: "stretch",
            }}
          >
            {GAMES.map((game) => (
              <GameCard key={game.href} game={game} />
            ))}
            <div
              style={{
                borderRadius: "18px",
                border: "1px dashed rgba(148, 163, 184, 0.28)",
                background: "rgba(2, 6, 23, 0.55)",
                padding: "18px",
                display: "grid",
                gap: "8px",
                alignContent: "start",
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: "-0.02em" }}>More games soon</div>
              <div style={{ color: "#94a3b8", lineHeight: 1.4 }}>
                Add another entry to <code>GAMES</code> in <code>app/page.tsx</code>.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "10px",
              padding: "14px 16px",
              borderRadius: "16px",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(15, 23, 42, 0.55)",
              color: "#cbd5e1",
              display: "grid",
              gap: "6px",
            }}
          >
            <div style={{ fontWeight: 900 }}>Controls</div>
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>
              Each game has its own controls. Tetris: arrows, Space, P, R.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

