"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";
import { triageRequest } from "@/components/requestTriage";

type ProfileMini = { username: string; avatar_url: string | null };

type RequestRow = {
  id: number;
  game: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles: ProfileMini | null;
  feature_request_votes: { user_id: string }[] | null;
};

type RawRequestRow = Omit<RequestRow, "profiles" | "feature_request_votes"> & {
  profiles: ProfileMini | ProfileMini[] | null;
  feature_request_votes: { user_id: string }[] | null;
};

function normalizeProfiles(input: ProfileMini | ProfileMini[] | null): ProfileMini | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  return input;
}

export default function RequestsBoard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);

  const [game, setGame] = useState("tetris");
  const [status, setStatus] = useState("open");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((r) => r.game === game && (status === "all" || r.status === status));
  }, [rows, game, status]);

  async function load() {
    setError(null);
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_requests")
      .select(
        "id,game,title,body,status,created_at,user_id,profiles(username,avatar_url),feature_request_votes(user_id)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setError("Failed to load requests.");
      setLoading(false);
      return;
    }

    const normalized = (data ?? []).map((d) => {
      const raw = d as unknown as RawRequestRow;
      return {
        ...raw,
        profiles: normalizeProfiles(raw.profiles),
        feature_request_votes: raw.feature_request_votes ?? [],
      } satisfies RequestRow;
    });

    setRows(normalized);
    setLoading(false);
  }

  async function createRequest() {
    if (!user) return;
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("feature_requests").insert({
        game,
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
      });
      if (error) {
        setError("Failed to submit request.");
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(r: RequestRow) {
    if (!user) return;
    const hasVoted = (r.feature_request_votes ?? []).some((v) => v.user_id === user.id);
    if (hasVoted) {
      await supabase
        .from("feature_request_votes")
        .delete()
        .eq("request_id", r.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("feature_request_votes").insert({ request_id: r.id, user_id: user.id });
    }
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "rgba(2, 6, 23, 0.55)",
          padding: "16px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Game</div>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#e5e7eb",
                padding: "10px 12px",
                fontWeight: 800,
              }}
            >
              <option value="tetris">Tetris</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Status</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#e5e7eb",
                padding: "10px 12px",
                fontWeight: 800,
              }}
            >
              <option value="open">Open</option>
              <option value="accepted">Accepted</option>
              <option value="implemented">Implemented</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => load()}
            style={{
              marginLeft: "auto",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "rgba(148, 163, 184, 0.10)",
              color: "#e5e7eb",
              borderRadius: "999px",
              padding: "10px 12px",
              fontSize: "13px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {!user ? (
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
            Log in to submit requests and vote.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "10px",
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Request title (short)"
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#e5e7eb",
                padding: "12px",
                fontWeight: 800,
              }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe what you want and why it improves the game."
              rows={4}
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#e5e7eb",
                padding: "12px",
                fontWeight: 600,
                resize: "vertical",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                Auto-triage runs after submit (game-only, no harmful suggestions).
              </div>
              <button
                type="button"
                onClick={() => createRequest()}
                disabled={submitting || !title.trim() || !body.trim()}
                style={{
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "#22c55e",
                  color: "#0b0d12",
                  fontWeight: 900,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting || !title.trim() || !body.trim() ? 0.55 : 1,
                }}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: "12px" }}>
        {loading ? (
          <div style={{ color: "#94a3b8" }}>Loading...</div>
        ) : error ? (
          <div style={{ color: "#fca5a5" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#94a3b8" }}>No requests match this filter.</div>
        ) : (
          filtered.map((r) => {
            const votes = r.feature_request_votes?.length ?? 0;
            const hasVoted = user
              ? (r.feature_request_votes ?? []).some((v) => v.user_id === user.id)
              : false;
            const triage = triageRequest({ game: r.game, title: r.title, body: r.body });

            return (
              <div
                key={r.id}
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(2, 6, 23, 0.55)",
                  padding: "14px",
                  display: "grid",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>{r.title}</div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: "12px",
                      color: "#cbd5e1",
                      background: "rgba(148, 163, 184, 0.12)",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "999px",
                      padding: "6px 10px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {r.status}
                  </div>
                </div>

                <div style={{ color: "#94a3b8", lineHeight: 1.5 }}>{r.body}</div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                    By <span style={{ color: "#e2e8f0", fontWeight: 900 }}>{r.profiles?.username ?? "player"}</span>
                    {" · "}
                    Votes <span style={{ color: "#e2e8f0", fontWeight: 900 }}>{votes}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleVote(r)}
                    disabled={!user}
                    style={{
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      background: hasVoted ? "rgba(34, 197, 94, 0.20)" : "rgba(148, 163, 184, 0.10)",
                      color: "#e5e7eb",
                      borderRadius: "999px",
                      padding: "8px 12px",
                      fontSize: "13px",
                      fontWeight: 900,
                      cursor: user ? "pointer" : "not-allowed",
                      opacity: user ? 1 : 0.6,
                    }}
                    title={user ? "Vote" : "Log in to vote"}
                  >
                    {hasVoted ? "Voted" : "Vote"}
                  </button>
                </div>

                <div
                  style={{
                    borderRadius: "12px",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    background: "rgba(15, 23, 42, 0.55)",
                    padding: "10px",
                    display: "grid",
                    gap: "6px",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: "13px" }}>Auto Review</div>
                  {triage.ok ? (
                    <div style={{ color: "#86efac", fontSize: "13px" }}>
                      Looks game-related and safe to consider.
                    </div>
                  ) : (
                    <div style={{ color: "#fca5a5", fontSize: "13px", lineHeight: 1.4 }}>
                      {triage.reasons.join(" ")}
                    </div>
                  )}
                  {triage.suggestedTags.length > 0 && (
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                      Tags: {triage.suggestedTags.join(", ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
