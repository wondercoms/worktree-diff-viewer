// Worktree管理ルート
import { Hono } from "hono";
import {
  listWorktrees,
  getCurrentBranch,
  listBranches,
  getWorkingTreeStatus,
  createWorktree,
  removeWorktree,
  mergeBranch,
  abortMerge,
  checkoutBranch,
  loadSelectedWorktrees,
  saveSelectedWorktrees,
} from "../git";
import {
  WorktreeManagePage,
  WorktreeResult,
  MergeResult,
  CheckoutResult,
} from "../views";

const app = new Hono();

// Worktree管理ページ
app.get("/manage", async (c) => {
  const repoPath = c.req.query("repo") || process.env.DEFAULT_BASE_PATH || process.cwd();
  const selectedParam = c.req.queries("selected") || [];

  const worktrees = await listWorktrees(repoPath);
  const currentBranch = await getCurrentBranch(repoPath);
  const { local: branches } = await listBranches(repoPath);
  const { hasUncommitted } = await getWorkingTreeStatus(repoPath);

  // 選択状態を計算（URLパラメータ優先、なければ保存された設定、それもなければデフォルト）
  const otherWorktrees = worktrees.filter(wt => wt.branch !== currentBranch);
  let selectedWorktrees: string[];

  if (selectedParam.length > 0) {
    selectedWorktrees = selectedParam;
  } else {
    // 保存された設定を読み込む
    const savedSelection = await loadSelectedWorktrees(repoPath);
    if (savedSelection.length > 0) {
      // 保存された設定があり、かつ現在も存在するworktreeのみフィルタ
      selectedWorktrees = savedSelection.filter(branch =>
        otherWorktrees.some(wt => wt.branch === branch)
      );
      if (selectedWorktrees.length === 0) {
        // 保存された設定が古くなっている場合はデフォルトロジック
        selectedWorktrees = otherWorktrees.length <= 3
          ? otherWorktrees.map(wt => wt.branch)
          : otherWorktrees.slice(0, 3).map(wt => wt.branch);
      }
    } else {
      // デフォルト: 3件以下なら全て、4件以上なら最新3件
      selectedWorktrees = otherWorktrees.length <= 3
        ? otherWorktrees.map(wt => wt.branch)
        : otherWorktrees.slice(0, 3).map(wt => wt.branch);
    }
  }

  return c.html(
    <WorktreeManagePage
      repoPath={repoPath}
      currentBranch={currentBranch}
      branches={branches}
      worktrees={worktrees}
      hasUncommitted={hasUncommitted}
      selectedWorktrees={selectedWorktrees}
    />
  );
});

// 選択状態を保存してメインページへリダイレクト
app.post("/save-selection", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;
  const selectedWorktrees = formData.getAll("selected") as string[];

  if (repoPath) {
    // 選択状態を保存
    await saveSelectedWorktrees(repoPath, selectedWorktrees);
  }

  // メインページへリダイレクト（選択状態をURLパラメータとして渡す）
  const params = new URLSearchParams();
  params.set("repo", repoPath);
  for (const branch of selectedWorktrees) {
    params.append("selected", branch);
  }

  return c.redirect(`/?${params.toString()}`);
});

// Worktree作成（htmx用）
app.post("/create-worktree", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;
  const worktreePath = formData.get("worktreePath") as string;
  const branchName = formData.get("branchName") as string;
  const createNewBranch = formData.get("createNewBranch") === "on";

  if (!repoPath || !worktreePath || !branchName) {
    return c.html(
      <WorktreeResult success={false} output="Missing required fields" />
    );
  }

  const result = await createWorktree(repoPath, worktreePath, branchName, createNewBranch);

  return c.html(
    <WorktreeResult success={result.success} output={result.output} />
  );
});

// Worktree削除（htmx用）
app.post("/remove-worktree", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;
  const worktreePath = formData.get("worktreePath") as string;

  if (!repoPath || !worktreePath) {
    return c.html(
      <WorktreeResult success={false} output="Missing required fields" />
    );
  }

  const result = await removeWorktree(repoPath, worktreePath);

  return c.html(
    <WorktreeResult success={result.success} output={result.output} />
  );
});

// ブランチをマージ（htmx用）
app.post("/merge-branch", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;
  const branchName = formData.get("branchName") as string;

  if (!repoPath || !branchName) {
    return c.html(
      <MergeResult success={false} output="Missing required fields" />
    );
  }

  const result = await mergeBranch(repoPath, branchName);

  return c.html(
    <MergeResult
      success={result.success}
      output={result.output}
      hasConflicts={result.hasConflicts}
      repoPath={repoPath}
    />
  );
});

// マージを中止（htmx用）
app.post("/abort-merge", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;

  if (!repoPath) {
    return c.html(
      <MergeResult success={false} output="Missing required fields" />
    );
  }

  const result = await abortMerge(repoPath);

  return c.html(
    <MergeResult success={result.success} output={result.output} />
  );
});

// ブランチ切り替え（htmx用）
app.post("/checkout-branch", async (c) => {
  const formData = await c.req.formData();
  const repoPath = formData.get("repoPath") as string;
  const branchName = formData.get("branchSelect") as string;

  if (!repoPath || !branchName) {
    return c.html(
      <CheckoutResult success={false} output="Please select a branch" />
    );
  }

  // 未コミットの変更があるか確認
  const { hasUncommitted } = await getWorkingTreeStatus(repoPath);
  if (hasUncommitted) {
    return c.html(
      <CheckoutResult
        success={false}
        output="Cannot switch branch: you have uncommitted changes.\nPlease commit or stash them first."
      />
    );
  }

  const result = await checkoutBranch(repoPath, branchName);

  // 成功したらページをリロードするようにヘッダーを追加
  if (result.success) {
    return c.html(
      <div>
        <CheckoutResult success={true} output={result.output} />
        <script dangerouslySetInnerHTML={{ __html: "setTimeout(() => location.reload(), 1000);" }} />
      </div>
    );
  }

  return c.html(
    <CheckoutResult success={result.success} output={result.output} />
  );
});

export default app;
