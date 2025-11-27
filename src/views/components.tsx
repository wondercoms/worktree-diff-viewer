import type { FC } from "hono/jsx";
import type { Worktree, WorktreeDiff } from "../git/worktree";

// レイアウト
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

// エージェントカラー
const agentColors: Record<string, string> = {
  Claude: "#da7756",
  Gemini: "#4285f4",
  Codex: "#10a37f",
  Copilot: "#6e40c9",
  Agent: "#6b7280",
};

// Worktreeカード（縦長パネル - ファイル一覧と差分表示を含む）
export const WorktreeCard: FC<{ diff: WorktreeDiff; index: number }> = ({ diff, index }) => {
  const agent = diff.worktree.agent || "Agent";
  const color = agentColors[agent] || agentColors.Agent;
  const panelId = `diff-panel-${index}`;

  return (
    <div class="worktree-column" style={`--agent-color: ${color}`}>
      <div class="column-header">
        <span class="agent-badge">{agent}</span>
        <span class="branch-name">{diff.worktree.branch}</span>
        <div class="card-stats">
          <span class="stat insertions">+{diff.totalInsertions}</span>
          <span class="stat deletions">-{diff.totalDeletions}</span>
          <span class="stat files">{diff.files.length} files</span>
        </div>
      </div>
      <div class="file-list">
        {diff.files.map((file) => (
          <div
            class="file-item"
            hx-get={`/diff-detail?path=${encodeURIComponent(diff.worktree.path)}&file=${encodeURIComponent(file.file)}`}
            hx-target={`#${panelId}`}
            hx-swap="innerHTML"
          >
            <span class="file-name">{file.file}</span>
            <span class="file-changes">
              <span class="ins">+{file.insertions}</span>
              <span class="del">-{file.deletions}</span>
            </span>
          </div>
        ))}
      </div>
      <div id={panelId} class="diff-panel">
        <p class="placeholder">ファイルをクリックすると差分が表示されます</p>
      </div>
    </div>
  );
};

// コンフリクト警告
export const ConflictWarning: FC<{ conflicts: Map<string, string[]> }> = ({ conflicts }) => {
  if (conflicts.size === 0) return null;

  const entries = Array.from(conflicts.entries());

  return (
    <div class="conflict-warning">
      <h3>⚠️ Potential Conflicts</h3>
      <ul>
        {entries.map(([file, agents]) => (
          <li>
            <code>{file}</code>
            <span class="conflict-agents">
              {agents.map((a) => (
                <span class="agent-tag" style={`background: ${agentColors[a] || agentColors.Agent}`}>
                  {a}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// メインダッシュボード
export const Dashboard: FC<{
  repoPath: string;
  baseBranch: string;
  diffs: WorktreeDiff[];
  conflicts: Map<string, string[]>;
}> = ({ repoPath, baseBranch, diffs, conflicts }) => (
  <Layout title="Worktree Diff Viewer">
    <div class="config-bar">
      <form hx-get="/" hx-target="body" hx-swap="outerHTML" class="config-form">
        <label>
          Repository:
          <input type="text" name="repo" value={repoPath} placeholder="/path/to/repo" />
        </label>
        <label>
          Base Branch:
          <input type="text" name="base" value={baseBranch} placeholder="main" />
        </label>
        <button type="submit">Refresh</button>
      </form>
    </div>

    <ConflictWarning conflicts={conflicts} />

    <div class="worktree-columns">
      {diffs.length > 0 ? (
        diffs.map((diff, index) => <WorktreeCard diff={diff} index={index} />)
      ) : (
        <div class="empty-state">
          <p>No worktrees found.</p>
          <p>リポジトリパスを入力して Refresh してください。</p>
        </div>
      )}
    </div>
  </Layout>
);

// 差分詳細パネル
export const DiffDetail: FC<{ file: string; diff: string }> = ({ file, diff }) => (
  <div class="diff-detail">
    <h3>{file}</h3>
    <pre class="diff-content">{colorizedDiff(diff)}</pre>
  </div>
);

// 差分に色をつける（簡易版）
function colorizedDiff(diff: string): any {
  const lines = diff.split("\n");
  return lines.map((line, i) => {
    let className = "diff-line";
    if (line.startsWith("+") && !line.startsWith("+++")) {
      className += " diff-add";
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      className += " diff-remove";
    } else if (line.startsWith("@@")) {
      className += " diff-hunk";
    }
    return <div class={className} key={i}>{line}</div>;
  });
}
