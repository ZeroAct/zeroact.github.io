"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/auth";

type ProfileMini = { username: string; avatar_url: string | null };

type RequestUpdateRow = {
  id: number;
  request_id: number;
  kind: string;
  note: string;
  created_at: string;
  profiles: ProfileMini | null;
};

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

export default function RequestsBoard({
  mode = "list",
}: {
  mode?: "list" | "create" | "both";
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [updatesByRequest, setUpdatesByRequest] = useState<Record<number, RequestUpdateRow[]>>(
    {}
  );
  const [updatesEnabled, setUpdatesEnabled] = useState(true);

  const [game, setGame] = useState<"tetris" | "general">("general");
  const [status, setStatus] = useState("all");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => r.game === game && (status === "all" || r.status === status));
  }, [rows, game, status]);

  const load = useCallback(async () => {
    setError(null);
    setErrorHint(null);
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_requests")
      .select(
        // Disambiguate embed when multiple FK relationships exist between tables.
        "id,game,title,body,status,created_at,user_id,profiles:profiles!feature_requests_user_id_fkey(username,avatar_url),feature_request_votes(user_id)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("feature_requests load error", error);
      const msg = (error as unknown as { message?: string }).message ?? String(error);
      setError(`Failed to load requests: ${msg}`);
      if (msg.toLowerCase().includes("failed to fetch")) {
        setErrorHint(
          `This often means a CORS/network issue. If you're using a custom domain, add "${window.location.origin}" to Supabase API CORS allowed origins.`
        );
      }
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

    // Optional: if you create `feature_request_updates` table in Supabase (see supabase/schema.sql),
    // we will show "what changed / why rejected" notes. If the table doesn't exist yet, ignore.
    try {
      const ids = normalized.map((r) => r.id);
      if (ids.length === 0) {
        setUpdatesByRequest({});
      } else if (updatesEnabled) {
        const { data: upd, error: updError } = await supabase
          .from("feature_request_updates")
          .select(
            "id,request_id,kind,note,created_at,profiles:profiles!feature_request_updates_user_id_fkey(username,avatar_url)"
          )
          .in("request_id", ids)
          .order("created_at", { ascending: false })
          .limit(200);

        if (updError) {
          const msg = String((updError as unknown as { message?: string }).message ?? "");
          if (msg.toLowerCase().includes("does not exist")) setUpdatesEnabled(false);
        } else {
          const map: Record<number, RequestUpdateRow[]> = {};
          for (const u of (upd ?? []) as unknown as Array<
            Omit<RequestUpdateRow, "profiles"> & { profiles: ProfileMini | ProfileMini[] | null }
          >) {
            const profiles = normalizeProfiles(u.profiles);
            const row: RequestUpdateRow = { ...u, profiles };
            map[row.request_id] = map[row.request_id] ?? [];
            map[row.request_id].push(row);
          }
          setUpdatesByRequest(map);
        }
      }
    } catch {
      // ignore
    }

    setLoading(false);
  }, [updatesEnabled]);

  async function createRequest() {
    if (!user) return;
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError(null);
    setErrorHint(null);
    setSubmitSuccess(null);
    try {
      const { error } = await supabase.from("feature_requests").insert({
        game,
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        status: "open",
      });
      if (error) {
        console.error("feature_requests insert error", error);
        const msg = (error as unknown as { message?: string }).message ?? String(error);
        setError(`Failed to submit request: ${msg}`);
        return;
      }
      setTitle("");
      setBody("");
      setSubmitSuccess("Request submitted.");
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
  }, [load]);

  const showList = mode === "list" || mode === "both";
  const showCreate = mode === "create" || mode === "both";

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {showList && (
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
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
            <label style={{ display: "grid", gap: "6px" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Category</div>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value as "tetris" | "general")}
                style={{
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.22)",
                  background: "rgba(15, 23, 42, 0.7)",
                  color: "#e5e7eb",
                  padding: "10px 12px",
                  fontWeight: 800,
                }}
              >
                <option value="general">General (Homepage)</option>
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
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="accepted">Accepted</option>
                <option value="implemented">Implemented</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div style={{ marginLeft: "auto", display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link
                href="/requests/new/"
                style={{
                  textDecoration: "none",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "999px",
                  background: "#22c55e",
                  color: "#0b0d12",
                  fontWeight: 950,
                }}
              >
                + Create
              </Link>
              <button
                type="button"
                onClick={() => load()}
                style={{
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
          </div>

          {!user && (
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>
              Guests can browse. Log in to submit requests and vote.
            </div>
          )}
        </section>
      )}

      {showCreate && (
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
              <div style={{ fontWeight: 950, letterSpacing: "-0.02em" }}>Create Request</div>
              <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.4 }}>
                Write a clear, game-related suggestion. Status starts as <b>open</b>.
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link
                href="/requests/"
                style={{
                  textDecoration: "none",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(148, 163, 184, 0.10)",
                  color: "#e5e7eb",
                  borderRadius: "999px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                View List
              </Link>
            </div>
          </div>

          {!user ? (
            <div style={{ color: "#94a3b8", fontSize: "14px" }}>
              Log in to submit a request.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {submitSuccess && (
                <div
                  style={{
                    borderRadius: "12px",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                    background: "rgba(34, 197, 94, 0.08)",
                    padding: "10px 12px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ color: "#bbf7d0", fontWeight: 900, fontSize: "13px" }}>
                    {submitSuccess}
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Link
                      href="/requests/"
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
                      View List
                    </Link>
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
                      Go Home
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSubmitSuccess(null)}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        background: "rgba(2, 6, 23, 0.25)",
                        color: "#e5e7eb",
                        borderRadius: "999px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <label style={{ display: "grid", gap: "6px" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 800 }}>Category</div>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value as "tetris" | "general")}
                  style={{
                    borderRadius: "12px",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    background: "rgba(15, 23, 42, 0.7)",
                    color: "#e5e7eb",
                    padding: "10px 12px",
                    fontWeight: 800,
                    width: "fit-content",
                  }}
                >
                  <option value="general">General (Homepage)</option>
                  <option value="tetris">Tetris</option>
                </select>
              </label>

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
                rows={6}
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
                <div style={{ color: "#94a3b8", fontSize: "13px" }} />
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
      )}

      {showList && (
        <section style={{ display: "grid", gap: "12px" }}>
        {loading ? (
          <div style={{ color: "#94a3b8" }}>Loading...</div>
        ) : error ? (
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ color: "#fca5a5" }}>{error}</div>
            {errorHint && <div style={{ color: "#94a3b8", fontSize: "13px" }}>{errorHint}</div>}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#94a3b8" }}>No requests match this filter.</div>
        ) : (
          filtered.map((r) => {
            const votes = r.feature_request_votes?.length ?? 0;
            const hasVoted = user
              ? (r.feature_request_votes ?? []).some((v) => v.user_id === user.id)
              : false;

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

                {(r.status !== "open" || (updatesByRequest[r.id]?.length ?? 0) > 0) && (
                  <div
                    style={{
                      borderRadius: "12px",
                      border: "1px solid rgba(148, 163, 184, 0.14)",
                      background: "rgba(15, 23, 42, 0.55)",
                      padding: "10px",
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "13px" }}>Status Notes</div>
                    {updatesEnabled ? (
                      (updatesByRequest[r.id] ?? []).length > 0 ? (
                        <div style={{ display: "grid", gap: "8px" }}>
                          {(updatesByRequest[r.id] ?? []).slice(0, 2).map((u) => (
                            <div key={u.id} style={{ color: "#cbd5e1", fontSize: "13px", lineHeight: 1.4 }}>
                              <b style={{ color: "#e2e8f0" }}>{u.kind}</b>
                              {": "}
                              {u.note}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.4 }}>
                          {r.status === "rejected"
                            ? "Rejected (no reason provided yet)."
                            : r.status === "accepted"
                              ? "Accepted."
                              : r.status === "implemented"
                                ? "Implemented."
                                : null}
                        </div>
                      )
                    ) : (
                      <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: 1.4 }}>
                        Admin notes are not configured yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        </section>
      )}
    </div>
  );
}
