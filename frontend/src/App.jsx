import { useState, useRef } from "react";
import { lookupWord, getHistory } from "./lib/api.js";

const HI = "'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif";
const HE = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BG = "#FAFAF8", WHITE = "#fff", INK = "#0F0F0F", PALE = "#999", LINE = "#E2E2E0", LINE2 = "#CACAC8";

const CATEGORY_COLORS = {
  core:      { border: "#D4A017", bg: "#FFFBEB", text: "#7A5C00" },
  adjacent:  { border: "#C0707A", bg: "#FFF0F3", text: "#7A2030" },
  stylistic: { border: "#999",    bg: "#F5F5F5", text: "#444"    },
};

const ERROR_DEFINITION = "該当する語彙として認識できません。";

export default function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);

  const isError = result?.definition === ERROR_DEFINITION;

  const handleLookup = async (word) => {
    const w = (word || input).trim();
    if (!w) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    try {
      const data = await lookupWord(w);
      setResult(data);
    } catch {
      setError("取得に失敗しました。再試行してください。");
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLookup();
  };

  const handleCopy = async (word) => {
    await navigator.clipboard.writeText(word);
    setCopied(word);
    setTimeout(() => setCopied(null), 1500);
  };

  const history = getHistory();

  const inputSt = {
    fontFamily: HI, fontSize: 15, color: INK, background: WHITE,
    border: `1px solid ${LINE2}`, borderRadius: 4, padding: "10px 14px",
    boxSizing: "border-box", outline: "none", flex: 1,
  };
  const primaryBtn = (disabled) => ({
    fontFamily: HE, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em",
    padding: "10px 18px", background: disabled ? LINE : INK, color: disabled ? PALE : WHITE,
    border: "none", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
  });
  const ghost = {
    fontFamily: HI, fontSize: 12, padding: "6px 12px", background: "transparent",
    color: INK, border: `1px solid ${LINE2}`, borderRadius: 4, cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: HI, background: BG, minHeight: "100vh", padding: "16px 14px", boxSizing: "border-box", color: INK, maxWidth: 640, margin: "0 auto" }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontFamily: HE, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Nuance</span>
        <button
          style={{ ...ghost, fontSize: 11, padding: "5px 10px", position: "relative" }}
          onClick={() => setShowHistory((v) => !v)}
        >
          履歴
        </button>
      </div>

      {/* 履歴パネル */}
      {showHistory && (
        <div style={{ background: WHITE, border: `1px solid ${LINE2}`, borderRadius: 4, marginBottom: 16, padding: "8px 0", maxHeight: 220, overflowY: "auto" }}>
          {history.length === 0
            ? <div style={{ padding: "12px 16px", fontSize: 12, color: PALE }}>履歴はありません</div>
            : history.map(({ word }) => (
              <button
                key={word}
                onClick={() => { setInput(word); handleLookup(word); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 16px", fontFamily: HI, fontSize: 13, color: INK, background: "none", border: "none", cursor: "pointer" }}
              >
                {word}
              </button>
            ))
          }
        </div>
      )}

      {/* 入力欄 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          ref={inputRef}
          style={inputSt}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="語を入力して Enter"
          autoFocus
        />
        <button style={primaryBtn(!input.trim() || loading)} onClick={() => handleLookup()} disabled={!input.trim() || loading}>
          引く
        </button>
      </div>

      {/* ローディング */}
      {loading && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: PALE,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`@keyframes pulse { 0%,80%,100%{opacity:.2} 40%{opacity:1} }`}</style>
          <div style={{ fontFamily: HE, fontSize: 9, letterSpacing: "0.18em", color: PALE, textTransform: "uppercase" }}>Looking up</div>
        </div>
      )}

      {/* エラー */}
      {error && !loading && (
        <div style={{ background: "#FEF2F2", border: "1px solid #DC2626", borderRadius: 4, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#7F1D1D" }}>{error}</span>
          <button style={{ ...ghost, fontSize: 11, padding: "4px 10px" }} onClick={() => handleLookup()}>再試行</button>
        </div>
      )}

      {/* 結果 */}
      {result && !loading && (
        <div>
          {/* 語ヘッダー */}
          <div style={{ marginBottom: isError ? 0 : 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: HE, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{result.word}</span>
              {result.reading && <span style={{ fontSize: 12, color: PALE }}>{result.reading}</span>}
              {result.pos && <span style={{ fontFamily: HE, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: PALE, textTransform: "uppercase", border: `1px solid ${LINE2}`, padding: "2px 6px", borderRadius: 2 }}>{result.pos}</span>}
            </div>
            {result.definition && (
              <p style={{ fontSize: 13, color: isError ? "#7F1D1D" : PALE, margin: 0, lineHeight: 1.7 }}>{result.definition}</p>
            )}
          </div>

          {/* カテゴリ */}
          {!isError && result.categories?.map(({ key, label, items }) => {
            if (!items?.length) return null;
            const col = CATEGORY_COLORS[key] || CATEGORY_COLORS.stylistic;
            return (
              <div key={key} style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: HE, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: PALE, marginBottom: 8 }}>{label}</div>
                {items.map(({ word, reading, nuance }) => (
                  <div
                    key={word}
                    onClick={() => handleCopy(word)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0",
                      borderBottom: `1px solid ${LINE}`, cursor: "pointer",
                    }}
                  >
                    <div style={{ width: 3, alignSelf: "stretch", background: col.border, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{word}</span>
                        {reading && <span style={{ fontSize: 11, color: PALE }}>{reading}</span>}
                        {copied === word && (
                          <span style={{ fontFamily: HE, fontSize: 9, color: col.text, background: col.bg, border: `1px solid ${col.border}`, padding: "1px 6px", borderRadius: 2 }}>copied</span>
                        )}
                      </div>
                      {nuance && <p style={{ fontSize: 12, color: PALE, margin: 0, lineHeight: 1.7 }}>{nuance}</p>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
