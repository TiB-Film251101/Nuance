# Nuance 引き継ぎメモ

最終更新：2026-05-20（v1.1 実装完了） / リポジトリ：`TiB-Film251101/Nuance`

## このドキュメントの目的

新規セッションで作業を引き継ぐための、決定事項・現状・残課題のまとめ。

---

## プロジェクト概要

執筆中に「語の類義語・言い換え・意味の確認」を瞬時に引けるWebツール。
辞書を引く動作を最小回数に圧縮することが第一目標。

Checker（原稿校正ツール）とは完全に独立。ブラウザ・スマホどこからでも起動可能。

---

## インフラ構成

| 項目 | 内容 |
|---|---|
| フロントエンド | GitHub Pages（`https://tib-film251101.github.io/Nuance/`） |
| APIプロキシ | Cloudflare Workers（`https://filmnuance-proxy.tib-film251101.workers.dev`） |
| AIモデル | `claude-haiku-4-5-20251001`（temperature: 0.3） |
| デプロイ | master push → GitHub Actions 自動ビルド → GitHub Pages |

### Cloudflare Worker のシークレット

`wrangler secret put` で設定済み（Cloudflare ダッシュボードで管理）：
- `ANTHROPIC_API_KEY`
- `NUANCE_SHARED_SECRET`

### GitHub Repository Secrets

Actions のビルド時に注入（Settings → Secrets → Actions）：
- `VITE_WORKER_URL`
- `VITE_NUANCE_SECRET`

---

## アプリの現在地

### 動いているもの（v1.1）

- 語を入力 → Enter → ニュアンス付き類義語を3カテゴリで表示
  - core（類義・中核）/ adjacent（近接）/ stylistic（文体的別解）
- 語をクリックでワンクリックコピー
- 検索履歴（直近20件・localStorage）
- PWA対応（スマホのホーム画面に追加可）
- エラー時は再試行ボタン表示
- Haiku が JSON をマークダウンで包んで返す場合も対応済み（`extractJSON()` で剥がす）
- iOS Safari で入力欄タップ時の自動ズームを防止（font-size: 16px）
- 検索時にキーボードを自動的に閉じる（blur）
- 検索完了後に結果エリアへ自動スクロール

### プロンプト（v1.1）の改善点

実運用でHaikuの出力品質に問題が観察されたため `prompt.js` を全面改訂した：

- **句・フレーズ禁止を明文化**：「○○と言う」「ぼそぼそ言う」のような連用形の組み合わせを類語として出さないルールを追加
- **派生語・SNS用法の禁止**：入力語の活用違い・派生名詞・業界特殊用法をcore/adjacentに出さないルールを追加
- **多様性の確保**：漢語・和語の混在と系統の違う語（音量系・漏出系・自己完結系など）を混ぜるよう指示
- **ニュアンス説明の指針を刷新**：「共通点」でなく「差分」を書く。「同じ」「共通する」禁止
- **出力例を追加**：「呟く」の理想出力を例示し、期待するフォーマットを具体化

### 性能・コスト

- 1回あたりコスト：**約 ¥0.5 以下**（input ~1100 tokens / output ~400 tokens）
- JSONの安定性：Haiku は稀にマークダウンで包むが `extractJSON()` で対処済み。3回失敗でエラー表示

---

## ファイル構成

```
Nuance/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          UI本体（検索・結果表示・履歴・コピー）
│   │   ├── index.css        グローバルCSS（input font-size: 16px など）
│   │   ├── main.jsx         エントリーポイント
│   │   └── lib/
│   │       ├── prompt.js    プロンプト定義（{{INPUT_WORD}} を置換）
│   │       └── api.js       lookupWord / extractJSON / 履歴管理
│   ├── public/
│   │   └── manifest.json    PWA設定
│   ├── index.html
│   ├── vite.config.js       base: "/Nuance/" でGitHub Pages対応
│   └── package.json
├── worker/
│   ├── src/index.js         Cloudflare Workers（CORS + shared secret認証）
│   └── wrangler.toml        name: filmnuance-proxy
├── .github/
│   └── workflows/deploy.yml  master push で自動デプロイ
└── .gitignore               .wrangler/ を除外済み
```

---

## ローカル開発

```bash
# frontend
cd frontend
npm install
# .env.local を用意（.env.local.example を参照）
npm run dev
# → http://localhost:5173/Nuance/ で確認
```

`.env.local` に必要な値：
```
VITE_WORKER_URL=https://filmnuance-proxy.tib-film251101.workers.dev
VITE_NUANCE_SECRET=（Cloudflareに設定したNUANCE_SHARED_SECRETと同じ値）
```

---

## 決定事項

### 採用した方針

1. **Haiku + temperature=0.3**：語彙選択のバリエーションは欲しいが安定性も必要
2. **共有シークレット認証**：Worker に `x-nuance-secret` ヘッダで認証。APIキーのクライアント露出を防ぐ
3. **extractJSON() でマークダウン剥がし**：Haiku は ` ```json ``` ` で包むことがある。直接parse → コードブロック除去 → オブジェクト抽出の順に試みる
4. **履歴はキャッシュとして使う**：同じ語はAPIを呼ばずに再表示（localStorage, 20件）
5. **Checker とは独立**：統合しない。Checker からのリンクは将来追加可

### プロンプト品質調整のヒント

単調な結果が続く場合の対処：

- **coreが少ない**：プロンプト末尾の `# 入力` 直前に「core は最大10個まで出せる。躊躇せず多めに出すこと。」を追加
- **文学的な語が出ない**：「文学作品（近現代の純文学・翻訳文学）で使われる語を必ず1〜2個含めること。」を追加
- **単調感が残る**：temperature を 0.3 → 0.5 に上げる（精度は若干下がる）

### セキュリティ方針

- ブラウザのDevToolsで `VITE_NUANCE_SECRET` は見えてしまう（JS に埋め込まれるため）
- ただし本気で悪用しようとした人間は防げない。個人利用ツールなので許容範囲
- 不正利用の兆候があれば `wrangler secret put NUANCE_SHARED_SECRET` で値を変え、GitHub Secrets と `.env.local` も更新するだけで対応可

---

## 残課題

### 近日対応

- **アイコン・ロゴ画像の差し替え**：Asami さんが Futura イタリックで作成予定
  - `frontend/public/icon-192.png`・`icon-512.png`・`manifest.json` の icons
  - ヘッダーのテキスト `Nuance` を画像ロゴに差し替え

### v2 以降

- **文脈ベースモード**：文章を渡してその場面に合う語を提案
- **意味確認モード**：「この表現意味合ってる？」を用例と語義で返す
- **お気に入り保存**：気に入った語を保存してあとで参照
- **Checker からのリンク**：Checker の校正結果から Nuance を開けるようにする

---

## 連絡事項

- ブランチは `master` 固定
- リポジトリは Public（GitHub Pages 無料枠の要件）
- Checker リポジトリ（TiB-Film251101/Checker）は Private のまま