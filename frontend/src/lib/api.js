import { buildPrompt } from "./prompt.js";

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const SHARED_SECRET = import.meta.env.VITE_NUANCE_SECRET;

function extractJSON(text) {
  const t = (text || "").trim();
  try { return JSON.parse(t); } catch {}
  const md = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) return JSON.parse(md[1].trim());
  const obj = t.match(/\{[\s\S]*\}/);
  if (obj) return JSON.parse(obj[0]);
  throw new SyntaxError("No valid JSON");
}

const HISTORY_KEY = "nuance_history";
const MAX_HISTORY = 20;

export async function lookupWord(word, retries = 2) {
  const prompt = buildPrompt(word);

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nuance-secret": SHARED_SECRET,
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2048,
          temperature: 0.3,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = extractJSON(text);
      pushHistory(word, parsed);
      return parsed;
    } catch (err) {
      if (i === retries) throw err;
    }
  }
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushHistory(word, result) {
  const history = getHistory();
  const filtered = history.filter((h) => h.word !== word);
  filtered.unshift({ word, result, timestamp: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
}
