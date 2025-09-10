# Night Club POS System (夜職向け会計システム)

## 概要
キャバクラ、スナック、ボーイズバーなど夜職向けの会計・勤怠管理システムです。
ブラウザのLocalStorageを使用し、完全にクライアントサイドで動作します。

## 機能
- 📝 伝票管理（紙伝票スタイル）
- 🍾 メニューマスタ管理（JSON形式）
- ⏰ 勤怠管理
- 📊 売上ダッシュボード
- ⚙️ 店舗設定

## ローカルでの起動方法

### 方法1: ファイルを直接開く
1. `index.html` をダブルクリックしてブラウザで開く

### 方法2: ローカルサーバーを使用
```bash
# Python 3を使用
python -m http.server 8000

# または Node.jsを使用
npx http-server

# または VSCodeのLive Server拡張機能を使用
```
その後、ブラウザで http://localhost:8000 にアクセス

## ディレクトリ構造
```
.
├─ index.html            # 単一ページエントリ（CDN React/Tailwind）
├─ app.js                # メインアプリ（IndexedDB/設定ロード対応）
├─ style.css             # 追加スタイル
├─ settings.local.json   # 店舗設定（税率・サービス料・支払方法等）
├─ menu.local.json       # メニュー定義（外部化）
├─ staff.local.json      # スタッフ初期データ（外部化）
├─ serena-config.json    # DB名・バージョン等の設定
├─ mcp-integration.json  # DBストア一覧などのメタ情報
├─ .env.example          # 参考用の環境設定例
├─ README.md             # 本ファイル
└─ nightclub-saas/       # Next.js サンプル（別実装・検証用）
    ├─ package.json
    ├─ next.config.ts
    └─ src/ ...
```

## GitHub Pagesでの公開方法

### 1. GitHubにプッシュ
```bash
# GitHub Personal Access Tokenを設定
export GITHUB_TOKEN='your-token-here'

# または GitHub CLIでログイン
gh auth login

# リポジトリを作成してプッシュ
gh repo create night-club-pos --public --push --source=.
```

### 2. GitHub Pagesを有効化
1. GitHubのリポジトリページにアクセス
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: main / root
5. Save

### 3. 公開URL
`https://[your-username].github.io/night-club-pos/`

## データの保存場所
現在はブラウザのIndexedDBを使用します（LocalStorageではありません）。
- DB名/バージョン: `serena-config.json` または `mcp-integration.json` で設定可能
- ストア: `settings`, `menu`, `tickets`, `guests`, `staff`, `shifts`, `payrollRules`

## 技術スタック
- React 18 (CDN版)
- Tailwind CSS (CDN版)
- Vanilla JavaScript
- LocalStorage API

## ライセンス
MIT License

## 注意事項
- データはブラウザのLocalStorageに保存されるため、ブラウザのデータを削除すると失われます
- 定期的にメニューデータのエクスポート機能を使用してバックアップを取ることを推奨します
- 本番環境での使用前に十分なテストを行ってください
