# Repository Guidelines

## プロジェクト構成とモジュール
- `index.html`: エントリーポイント（React/Tailwind をCDN読み込み）。
- `app.js`: メインロジック（ビルド不要の React、JSのみ）。
- `style.css`: 追加スタイル（基本は Tailwind ユーティリティを使用）。
- 試作: `*.jsx` はプロトタイプ用の参照ファイルで、`index.html` からは読み込まれません。

## 開発・ビルド・動作確認
- ビルド不要。ローカル実行:
  - `python -m http.server 8000` → http://localhost:8000 にアクセス
  - または `npx http-server`、VS Code の Live Server を使用
- 直接起動: `index.html` を開くだけでも可（fetch() 利用箇所はHTTP配信を推奨）。

## コーディング規約と命名
- JavaScript: ES6+、インデント2スペース、`const/let` を使用しグローバル汚染を避ける。
- React: コンポーネントは PascalCase、ヘルパーは camelCase。プロダクションでは JSX を使わず `React.createElement`（`app.js` 参照）。
- スタイル: 可能な限り Tailwind を用い、カスタムは `style.css` に集約。
- ID: 伝票IDは `T-YYYYMMDD-XXX` 形式（既存仕様を維持）。

## テスト指針
- 現状フレームワークなし。変更ごとの手動スモークテスト:
  - 伝票作成→明細追加/削除→合計（サービス料・税・端数）を確認。
  - 均等割/明細移動の分割、CSVエクスポートを確認。
  - 設定変更後の再計算、リロードによる IndexedDB 永続化確認。
- 将来の自動テストは `tests/` 配下に `{feature}.spec.js` などで追加。

## コミットとPR方針
- コミット: Conventional Commits を推奨（例: `feat: 均等割の人数指定を追加`）。
- PR: 概要、UI変更のスクリーンショット、再現/確認手順、関連Issue（例: `Closes #12`）を記載。差分は小さく保つ。

## セキュリティと設定
- データはブラウザの IndexedDB（`astoria-pos`）に保存。サーバや秘密情報は不要。資格情報はコミットしない。
- 開発時に `settings.local.json` を参照する場合あり。環境依存値を含む場合はバージョン管理から除外してください。
