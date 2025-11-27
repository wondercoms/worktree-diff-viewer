// JSON API ルート
import { Hono } from "hono";
import {
  listWorktrees,
  getWorktreeDiff,
  detectPotentialConflicts,
  getFileHunks,
  generatePatch,
  applyPatch,
  findGitRepositoriesCached,
  type WorktreeDiff,
} from "../git";

const app = new Hono();

// API: worktree一覧（JSON）
app.get("/api/worktrees", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_BASE_PATH || process.cwd();
  const worktrees = await listWorktrees(repoPath);
  return c.json(worktrees);
});

// API: リポジトリ一覧（JSON）
app.get("/api/repositories", async (c) => {
  const repositories = await findGitRepositoriesCached();
  return c.json(repositories);
});

// API: 差分取得（JSON）
app.get("/api/diffs", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_BASE_PATH || process.cwd();
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

// API: hunk情報取得（JSON）
app.get("/api/hunks", async (c) => {
  const worktreePath = c.req.query("worktreePath") || "";
  const filePath = c.req.query("file") || "";
  const baseBranch = c.req.query("base") || "main";

  if (!worktreePath || !filePath) {
    return c.json({ error: "Invalid parameters" }, 400);
  }

  const fileHunks = await getFileHunks(worktreePath, filePath, baseBranch);
  return c.json(fileHunks);
});

// API: パッチ適用（JSON）
app.post("/api/apply-hunks", async (c) => {
  const body = await c.req.json();
  const { worktreePath, targetPath, baseBranch, file, selectedHunks } = body;

  if (!worktreePath || !targetPath || !file || !selectedHunks?.length) {
    return c.json({ error: "Invalid parameters" }, 400);
  }

  const fileHunks = await getFileHunks(worktreePath, file, baseBranch || "main");
  const patch = generatePatch(fileHunks, selectedHunks);

  if (!patch) {
    return c.json({ error: "Failed to generate patch" }, 400);
  }

  const result = await applyPatch(targetPath, patch);
  return c.json(result);
});

export default app;
