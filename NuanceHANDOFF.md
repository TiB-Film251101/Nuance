# Nuance 引き継ぎメモ

最終更新：2026-05-22（v1.2 仕様確定・実装待ち） / リポジトリ：`TiB-Film251101/Nuance`

## このドキュメントの目的

新規セッションで作業を引き継ぐための、決定事項・現状・残課題のまとめ。

---

## プロジェクト概要

執筆中に「語の類義語・言い換え・意味の確認」を瞬時に引けるWebツール。
辞書を引く動作を最小回数に圧縮することが第一目標。

Checker（原稿校正ツール）とは完全に独立。ブラウザ・スマホどこからでも起動可能。

将来的にはLens（Checker改名予定）/ Nuance / Fuel（書籍推薦・未実装）の3ツールをTauri統合する構想がある（`Lens_Nuance_Fuel_概略.md` 参照）。

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

### v1.1で動いているもの（master）

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

### v1.2で予定している変更（仕様確定・未実装）

**運用知見**：v1.1を実運用したところ、stylistic（文体的別解）は古語・文語調の語が中心になりがちで、現代小説の執筆中に即座に拾える語が少なかった。代わりに「冷たい→突き放した／カドのある／他人事のような」のような **比喩・描写的形容句** が欲しい場面が多かった。

**変更内容**：

1. **stylistic カテゴリを削除**
2. **descriptive カテゴリを新設**：語そのものではなく、性質・態度・振る舞い・身体感覚を描写する形容句を返す。連用修飾の形（〜な／〜した／〜のような／〜めいた）を許可。
3. **3カテゴリ構成へ移行**：core / adjacent / descriptive

**descriptive の定義**：
- 身体的比喩（トゲのある、カドのある）
- 態度描写（突き放した、他人事のような）
- 身体感覚の翻訳（押し殺した、喉に引っかかったような）

「○○と言う」のような動詞接続は禁止。被修飾語に直接かかる連体・連用の形容句のみ。

**descriptive の量**：3〜8個（core と同等の重要度として扱う）

### v1.1のプロンプト改善点（v1.2にも継承）

実運用でHaikuの出力品質に問題が観察されたため `prompt.js` を改訂済み：

- **句・フレーズ禁止を明文化**：「○○と言う」「ぼそぼそ言う」のような連用形の組み合わせを類語として出さないルール（**v1.2ではdescriptiveのみ例外として句を許可**）
- **派生語・SNS用法の禁止**：入力語の活用違い・派生名詞・業界特殊用法をcore/adjacentに出さないルール
- **多様性の確保**：漢語・和語の混在と系統の違う語を混ぜる
- **ニュアンス説明の指針**：「共通点」でなく「差分」を書く。「同じ」「共通する」禁止
- **出力例**：「呟く」の理想出力を例示（v1.2ではdescriptiveの例も追加）

### 性能・コスト

- v1.1：1回あたり約 ¥0.5以下（input ~1100 tokens / output ~400 tokens）
- v1.2見込み：stylistic削除（~100 tokens減）＋ descriptive追加（~150 tokens増）で output ~450 tokens、コストはほぼ据え置き
- JSONの安定性：Haiku は稀にマークダウンで包むが `extractJSON()` で対処済み。3回失敗でエラー表示

---

## ファイル構成
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

---

## 決定事項

### 採用した方針

1. **Haiku + temperature=0.3**：語彙選択のバリエーションは欲しいが安定性も必要
2. **共有シークレット認証**：Worker に `x-nuance-secret` ヘッダで認証。APIキーのクライアント露出を防ぐ
3. **extractJSON() でマークダウン剥がし**：Haiku は ` ```json ``` ` で包むことがある。直接parse → コードブロック除去 → オブジェクト抽出の順に試みる
4. **履歴はキャッシュとして使う**：同じ語はAPIを呼ばずに再表示（localStorage, 20件）
5. **Checker とは独立**：統合しない。Checker からのリンクは将来追加可
6. **v1.2: 3カテゴリ構成（core / adjacent / descriptive）**：stylisticは実用度が低かったため削除。比喩・形容句のレイヤーを新設

### v1.2で採用しなかった案（理由付き）

| 案 | 理由 |
|---|---|
| stylisticを残して量を絞る | あったら嬉しいが無くて困らないポジション。シンプル化を優先 |
| stylisticをdescriptiveに吸収 | カテゴリ境界が曖昧になり出力が混ざる懸念 |
| stylistic削除分を他カテゴリの上限増に回す | core/adjacentの上限は現状で十分機能している |
| descriptiveを身体的比喩のみ／態度描写のみに絞る | 両者は連続体で境界が曖昧。混在を許容するほうが自然 |

### プロンプト品質調整のヒント

単調な結果が続く場合の対処：

- **coreが少ない**：プロンプト末尾の `# 入力` 直前に「core は最大10個まで出せる。躊躇せず多めに出すこと。」を追加
- **descriptiveに動詞接続が混ざる**：「悪い例: 冷たく言う」のような明示的なNG例を追記
- **単調感が残る**：temperature を 0.3 → 0.5 に上げる（精度は若干下がる）

### セキュリティ方針

- ブラウザのDevToolsで `VITE_NUANCE_SECRET` は見えてしまう（JS に埋め込まれるため）
- ただし本気で悪用しようとした人間は防げない。個人利用ツールなので許容範囲
- 不正利用の兆候があれば `wrangler secret put NUANCE_SHARED_SECRET` で値を変え、GitHub Secrets と `.env.local` も更新するだけで対応可

---

## 残課題

### 次セッションで着手予定（v1.2実装）

1. **`frontend/src/lib/prompt.js` の差し替え**
   - stylisticカテゴリの記述を削除
   - descriptiveカテゴリの定義・禁止事項・出力例を追加
   - 確定版プロンプトは過去セッション末尾を参照

2. **`frontend/src/App.jsx` の修正**
   - stylisticのレンダリングブロック削除
   - descriptiveのレンダリングブロック追加（core/adjacentと同じ構造）
   - カテゴリラベル表示の更新（「文体的別解」→「描写的形容」）
   - 表示順：core → adjacent → descriptive

3. **`frontend/src/lib/api.js` の確認**
   - レスポンスのバリデーションで `stylistic` を必須キーから外し、`descriptive` を必須に
   - 該当処理が無ければスキップ

4. **動作確認**
   - 「呟く」「冷たい」「歩く」「悲しい」など複数の品詞・性質の語で出力確認
   - descriptiveに動詞接続の句が混ざらないか観察

### 近日対応

- **アイコン・ロゴ画像の差し替え**：Asami さんが Futura イタリックで作成予定
  - `frontend/public/icon-192.png`・`icon-512.png`・`manifest.json` の icons
  - ヘッダーのテキスト `Nuance` を画像ロゴに差し替え

### v2 以降

- **文脈ベースモード**：文章を渡してその場面に合う語を提案
- **意味確認モード**：「この表現意味合ってる？」を用例と語義で返す
- **お気に入り保存**：気に入った語を保存してあとで参照
- **Checker（→ Lens）からのリンク**：校正結果から Nuance を開けるようにする
- **Tauri統合**：Lens / Nuance / Fuel の3ツールをデスクトップアプリ化

---

## 連絡事項

- ブランチは `master` 固定
- リポジトリは Public（GitHub Pages 無料枠の要件）
- Checker リポジトリ（TiB-Film251101/Checker）は Private のまま
