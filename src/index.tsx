import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import {
  listWorktrees,
  getWorktreeDiff,
  getFileDiff,
  detectPotentialConflicts,
  type WorktreeDiff,
} from "./git/worktree";
import { Dashboard, DiffDetail } from "./views/components";

const app = new Hono();

// 静的ファイル配信
app.use("/styles.css", serveStatic({ path: "./public/styles.css" }));

// メインページ
app.get("/", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_REPO_PATH || process.cwd();
  const baseBranch = c.req.query("base") || "main";

  // worktree一覧を取得
  const worktrees = await listWorktrees(repoPath);

  // 各worktreeの差分を取得（メインworktree以外）
  const diffs: WorktreeDiff[] = [];
  for (const wt of worktrees) {
    // メインブランチのworktreeはスキップ
    if (wt.branch === baseBranch || wt.branch === "master") continue;
    const diff = await getWorktreeDiff(repoPath, wt, baseBranch);
    diffs.push(diff);
  }

  // コンフリクト検出
  const conflicts = await detectPotentialConflicts(diffs);

  return c.html(
    <Dashboard
      repoPath={repoPath}
      baseBranch={baseBranch}
      diffs={diffs}
      conflicts={conflicts}
    />
  );
});

// 差分詳細取得（htmx用）
app.get("/diff-detail", async (c) => {
  const worktreePath = c.req.query("path") || "";
  const filePath = c.req.query("file") || "";
  const baseBranch = c.req.query("base") || "main";

  if (!worktreePath || !filePath) {
    return c.html(<p>Invalid parameters</p>);
  }

  const diff = await getFileDiff(worktreePath, filePath, baseBranch);
  return c.html(<DiffDetail file={filePath} diff={diff} />);
});

// API: worktree一覧（JSON）
app.get("/api/worktrees", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_REPO_PATH || process.cwd();
  const worktrees = await listWorktrees(repoPath);
  return c.json(worktrees);
});

// API: 差分取得（JSON）
app.get("/api/diffs", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_REPO_PATH || process.cwd();
  const baseBranch = c.req.query("base") || "main";

  const worktrees = await listWorktrees(repoPath);
  const diffs: WorktreeDiff[] = [];

  for (const wt of worktrees) {
    if (wt.branch === baseBranch || wt.branch === "master") continue;
    const diff = await getWorktreeDiff(repoPath, wt, baseBranch);
    diffs.push(diff);
  }

  const conflicts = await detectPotentialConflicts(diffs);

  return c.json({
    diffs,
    conflicts: Object.fromEntries(conflicts),
  });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`
🌳 Worktree Diff Viewer
   http://localhost:${port}
   
   Usage: Open the URL and enter your repository path.
`);

export default {
  port,
  fetch: app.fetch,
};
