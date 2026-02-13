export type TriageResult = {
  ok: boolean;
  reasons: string[];
  suggestedTags: string[];
};

const BAD_TOPICS = [
  "payment",
  "billing",
  "crypto",
  "wallet",
  "exploit",
  "hack",
  "cheat",
  "ddos",
  "phishing",
  "malware",
  "steal",
  "token",
  "service role",
  "admin key",
];

const GAME_TOPICS = [
  "homepage",
  "home page",
  "arcade",
  "requests",
  "feature",
  "navigation",
  "card",
  "tetris",
  "controls",
  "difficulty",
  "speed",
  "gravity",
  "rotation",
  "das",
  "arr",
  "scoring",
  "leaderboard",
  "sound",
  "music",
  "theme",
  "mobile",
  "touch",
  "ui",
  "accessibility",
];

export function triageRequest(input: { title: string; body: string; game: string }): TriageResult {
  const text = `${input.game}\n${input.title}\n${input.body}`.toLowerCase();

  const reasons: string[] = [];
  const suggestedTags: string[] = [];

  for (const bad of BAD_TOPICS) {
    if (text.includes(bad)) reasons.push(`Contains potentially unsafe / out-of-scope topic: "${bad}".`);
  }

  let gameSignals = 0;
  for (const good of GAME_TOPICS) {
    if (text.includes(good)) gameSignals += 1;
  }
  if (gameSignals === 0) reasons.push("Does not look like a game-related request.");

  if (text.includes("difficulty") || text.includes("speed") || text.includes("gravity")) {
    suggestedTags.push("difficulty");
  }
  if (text.includes("touch") || text.includes("mobile")) suggestedTags.push("mobile");
  if (text.includes("leaderboard") || text.includes("rank")) suggestedTags.push("leaderboard");
  if (text.includes("ui") || text.includes("layout")) suggestedTags.push("ui");
  if (text.includes("sound") || text.includes("music")) suggestedTags.push("audio");

  return {
    ok: reasons.length === 0,
    reasons,
    suggestedTags: Array.from(new Set(suggestedTags)),
  };
}
