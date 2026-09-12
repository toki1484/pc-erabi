# pc-erabi

ゲーミングPC・BTOの購入検討を助けるツールサイト。

競合（大手メディア・価格比較サイト）に記事の量で勝つのではなく、
**手作業では維持できないデータとツール**で差別化する方針。事業としての定義は
[docs/roadmap.md](docs/roadmap.md) を参照。

## いま動くもの

- **ゲーム別スペック診断** (`/`) — 遊びたいタイトルと目標の解像度・fpsから、
  必要なGPU・CPU・メモリの目安を出す。1ページで完結する対話型ツール

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm run build        # 本番ビルド (dist/)
npm run verify:data  # データの品質ゲート（未検証データの一覧）
npm run deploy       # Cloudflare へデプロイ（通常は push で自動実行される）
```

### デプロイ

Cloudflare Workers の静的アセット配信で動かす。設定は `wrangler.jsonc`。
`main` への push で自動デプロイされるため、通常は手動実行しない。

`wrangler.jsonc` を消すと、wrangler がビルド時に `astro add cloudflare` による
自動設定を試みて `public/.assetsignore` が無いと言って失敗するので、消さないこと。

### データの扱い

`src/data/games.json` の各タイトルは、公式情報との突き合わせが済むまで `verified: false` とし、
サイト上に「要確認」バッジを表示する。**`verified` を true にする判断は運営者のみが行う。**
`npm run verify:data` で未確認の一覧と出典URLが出る。

`src/data/gpus.json` の相対性能スコアは RTX 4060 を 100 とした目安であり実測値ではない。
実機ベンチマークを取得し次第、補正する。

### 見た目の確認

ブラウザでの表示崩れ・JSエラーを確認する場合:

```bash
npm install -D playwright   # 常用しないので依存には含めていない
npm run build && npx serve dist
```

## 構成

- `src/pages/index.astro` — 診断ツールのUI
- `src/lib/diagnose.js` — 診断ロジック（DOM非依存の純粋関数）
- `src/data/games.json` — タイトル別の動作環境と出典
- `src/data/gpus.json` — GPUの相対性能スコア
- `scripts/verify-data.mjs` — データの品質ゲート

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/roadmap.md](docs/roadmap.md) | 事業ロードマップ（ターゲット・KPI・撤退基準）**最新の前提はこれ** |
| [docs/fact-check.md](docs/fact-check.md) | 復元ドキュメントの一次情報による検証結果 |
| [docs/affiliate-plan.md](docs/affiliate-plan.md) | 実行計画（一部は roadmap が上書き） |
| [docs/affiliate-research.md](docs/affiliate-research.md) | 市況調査 |
| [docs/setup-checklist.md](docs/setup-checklist.md) | 外部アカウントの接続手順 |
