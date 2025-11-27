// メインページルート
import { Hono } from "hono";
import {
  listWorktrees,
  getWorktreeDiff,
  getCurrentBranch,
  findGitRepositoriesCached,
  loadSelectedWorktrees,
  type WorktreeDiff,
} from "../git";
import { HunkSelectDashboard } from "../views";

const app = new Hono();

// メインページ（Hunk選択機能）
app.get("/", async (c) => {
  // リポジトリ一覧を先に取得
  const repositories = await findGitRepositoriesCached();

  // repoパラメータがない場合は、worktreeを持つ最初のリポジトリをデフォルトにする
  let repoPath = c.req.query("repo");
  if (!repoPath) {
    const repoWithWorktrees = repositories.find(r => r.hasWorktrees);
    repoPath = repoWithWorktrees?.path || repositories[0]?.path || process.env.DEFAULT_BASE_PATH || process.cwd();
  }

  // 選択されたworktreeのブランチ名を取得（URLパラメータ優先、なければ保存された設定を使用）
  let selectedParam = c.req.queries("selected") || [];

  // 現在のブランチを取得
  const currentBranch = await getCurrentBranch(repoPath);
  const baseBranch = currentBranch || "main";

  const worktrees = await listWorktrees(repoPath);
  const otherWorktrees = worktrees.filter(wt => wt.branch !== baseBranch);

  // 表示するworktreeを決定
  let displayWorktrees: typeof worktrees;
  if (selectedParam.length > 0) {
    // URLパラメータがあればそれを使用
    displayWorktrees = otherWorktrees.filter(wt => selectedParam.includes(wt.branch));
  } else {
    // URLパラメータがなければ保存された設定を読み込む
    const savedSelection = await loadSelectedWorktrees(repoPath);
    if (savedSelection.length > 0) {
      // 保存された設定があり、かつ現在も存在するworktreeのみフィルタ
      const validSavedSelection = savedSelection.filter(branch =>
        otherWorktrees.some(wt => wt.branch === branch)
      );
      if (validSavedSelection.length > 0) {
        displayWorktrees = otherWorktrees.filter(wt => validSavedSelection.includes(wt.branch));
      } else {
        // 保存された設定が古くなっている場合はデフォルトロジック
        displayWorktrees = otherWorktrees.length <= 3 ? otherWorktrees : otherWorktrees.slice(0, 3);
      }
    } else {
      // デフォルト: 3件以下なら全て、4件以上なら最新3件
      displayWorktrees = otherWorktrees.length <= 3 ? otherWorktrees : otherWorktrees.slice(0, 3);
    }
  }

  const diffs: WorktreeDiff[] = [];
  for (const wt of displayWorktrees) {
    const diff = await getWorktreeDiff(repoPath, wt, baseBranch);
    diffs.push(diff);
  }

  return c.html(
    <HunkSelectDashboard
      repoPath={repoPath}
      baseBranch={baseBranch}
      diffs={diffs}
      repositories={repositories}
    />
  );
});

export default app;
