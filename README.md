# Worktree Diff Viewer

複数のAIエージェント（Claude Code、Gemini CLI、Codex など）が並列で作業している Git worktree の差分を可視化するツールです。

## 機能

### 差分表示
- 📂 Worktree 一覧の自動検出
- 📊 各 worktree の変更統計（追加/削除行数、ファイル数）
- 🔍 ファイルごとの差分表示
- ⚠️ 複数エージェントが同じファイルを編集している場合のコンフリクト警告
- 🎨 エージェント別のカラーコーディング

### Hunk 単位の変更取り込み
- ✅ 差分を hunk（変更ブロック）単位で選択的に取り込み可能
- 🔀 必要な変更だけをメインブランチに適用

### Worktree 管理
- ➕ 新規 Worktree の作成（ブランチ名指定）
- 🗑️ 不要な Worktree の削除
- 🔄 Worktree のブランチをメインブランチにマージ
- 📋 Worktree 一覧の表示と管理

AI agent diff viewer
<img width="1445" height="1224" alt="Image" src="https://github.com/user-attachments/assets/17bb32f2-e39c-4f11-8365-38dbd6990ce2" />

Manage worktree
<img width="1437" height="1060" alt="Image" src="https://github.com/user-attachments/assets/88828569-b687-4839-b5a4-55082a7b353c" />

## セットアップ

### Bun のインストール

#### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

または Homebrew を使用：

```bash
brew install oven-sh/bun/bun
```

#### Windows

PowerShell で以下を実行：

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

または npm 経由でインストール：

```bash
npm install -g bun
```

### プロジェクトのセットアップ

```bash
# 依存関係インストール
cd worktree-diff-viewer
bun install

# 開発サーバー起動
bun run dev
```

### ポートの変更

デフォルトではポート 3000 で起動します。変更したい場合は環境変数 `PORT` を指定してください：

```bash
PORT=3001 bun run dev
```

## 使い方

1. ブラウザで http://localhost:3000 を開く
2. "Repository" にGitリポジトリのパスを入力
3. "Base Branch" にベースブランチ名を入力（デフォルト: main）
4. "Refresh" をクリック

## Worktree の準備例

```bash
# メインリポジトリで worktree を作成
cd ~/projects/my-app

git worktree add ../my-app-claude feature/claude-auth
git worktree add ../my-app-gemini feature/gemini-api
git worktree add ../my-app-codex feature/codex-tests
```

各 worktree で別のAIエージェントを使って開発し、このビューアで差分を確認できます。

## API

JSON API も提供しています：
de
```bash
# Worktree 一覧
curl "http://localhost:3000/api/worktrees?repo=/path/to/repo"

# 差分情報
curl "http://localhost:3000/api/diffs?repo=/path/to/repo&base=main"
```

## 技術スタック

- [Hono](https://hono.dev/) - 軽量 Web フレームワーク
- [Bun](https://bun.sh/) - JavaScript ランタイム
- [htmx](https://htmx.org/) - インタラクティブ UI

## ライセンス

MIT
