// レイアウトコンポーネント
import type { FC } from "hono/jsx";

export const Layout: FC<{ title: string; children: any }> = ({ title, children }) => (
  <html lang="ja">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🌳 Worktree Diff Viewer</h1>
          <p class="subtitle">Multi-Agent Development Dashboard</p>
        </header>
        {children}
      </div>
    </body>
  </html>
);

// エージェントカラー定数
export const agentColors: Record<string, string> = {
  Claude: "#da7756",
  Gemini: "#4285f4",
  Codex: "#10a37f",
  Copilot: "#6e40c9",
  Agent: "#6b7280",
};
