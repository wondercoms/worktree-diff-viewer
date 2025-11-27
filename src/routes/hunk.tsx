// Hunk関連ルート
import { Hono } from "hono";
import {
  getFileHunks,
  generatePatch,
  applyPatch,
  previewPatch,
} from "../git";
import { HunkSelector, ApplyResult } from "../views";

const app = new Hono();

// Hunk選択UI取得（htmx用）
app.get("/hunk-selector", async (c) => {
  const worktreePath = c.req.query("worktreePath") || "";
  const filePath = c.req.query("file") || "";
  const repoPath = c.req.query("repoPath") || "";
  const baseBranch = c.req.query("base") || "main";

  if (!worktreePath || !filePath) {
    return c.html(<p>Invalid parameters</p>);
  }

  const fileHunks = await getFileHunks(worktreePath, filePath, baseBranch);

  return c.html(
    <HunkSelector
      fileHunks={fileHunks}
      worktreePath={worktreePath}
      repoPath={repoPath}
      baseBranch={baseBranch}
    />
  );
});

// パッチ適用（htmx用）
app.post("/apply-hunks", async (c) => {
  const formData = await c.req.formData();
  const worktreePath = formData.get("worktreePath") as string;
  const repoPath = formData.get("repoPath") as string;
  const baseBranch = formData.get("baseBranch") as string;
  const filePath = formData.get("file") as string;
  const selectedHunks = formData.getAll("selectedHunks") as string[];

  if (!worktreePath || !repoPath || !filePath || selectedHunks.length === 0) {
    return c.html(
      <ApplyResult
        success={false}
        output="No hunks selected or invalid parameters"
      />
    );
  }

  // ファイルのhunk情報を取得
  const fileHunks = await getFileHunks(worktreePath, filePath, baseBranch);

  // パッチを生成
  const patch = generatePatch(fileHunks, selectedHunks);

  if (!patch) {
    return c.html(
      <ApplyResult success={false} output="Failed to generate patch" />
    );
  }

  // パッチをリポジトリに適用
  const result = await applyPatch(repoPath, patch);

  return c.html(
    <ApplyResult success={result.success} output={result.output} />
  );
});

// パッチプレビュー（htmx用）
app.post("/preview-hunks", async (c) => {
  const formData = await c.req.formData();
  const worktreePath = formData.get("worktreePath") as string;
  const repoPath = formData.get("repoPath") as string;
  const baseBranch = formData.get("baseBranch") as string;
  const filePath = formData.get("file") as string;
  const selectedHunks = formData.getAll("selectedHunks") as string[];

  if (!worktreePath || !repoPath || !filePath || selectedHunks.length === 0) {
    return c.html(
      <ApplyResult
        success={false}
        output="No hunks selected or invalid parameters"
        isPreview={true}
      />
    );
  }

  // ファイルのhunk情報を取得
  const fileHunks = await getFileHunks(worktreePath, filePath, baseBranch);

  // パッチを生成
  const patch = generatePatch(fileHunks, selectedHunks);

  if (!patch) {
    return c.html(
      <ApplyResult success={false} output="Failed to generate patch" isPreview={true} />
    );
  }

  // プレビュー（dry-run）
  const result = await previewPatch(repoPath, patch);

  return c.html(
    <ApplyResult
      success={result.success}
      output={result.success ? `Patch preview:\n\n${patch}` : result.output}
      isPreview={true}
    />
  );
});

export default app;
