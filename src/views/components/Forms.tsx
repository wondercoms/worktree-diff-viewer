// フォームコンポーネント
import type { FC } from "hono/jsx";

// Worktree作成フォーム
export const CreateWorktreeForm: FC<{
  repoPath: string;
}> = ({ repoPath }) => {
  // repoPathからリポジトリ名を取得してパス生成用の情報を準備
  const repoName = repoPath.replace(/\/$/, "").split("/").pop() || "repo";
  const parentDir = repoPath.replace(/\/$/, "").split("/").slice(0, -1).join("/");
  const worktreeBaseDir = `${parentDir}/worktree`;

  return (
    <div class="create-worktree-section">
      <h3>Create New Worktree</h3>
      <form id="create-worktree-form" class="create-worktree-form">
        <input type="hidden" name="repoPath" value={repoPath} />
        <div class="form-row">
          <label>
            Worktree Path:
            <input
              type="text"
              name="worktreePath"
              id="worktreePath"
              placeholder={`${worktreeBaseDir}/${repoName}-agent`}
              required
            />
          </label>
          <label>
            Branch Name:
            <input
              type="text"
              name="branchName"
              id="branchName"
              placeholder="agent-name"
              required
            />
          </label>
          <label class="checkbox-label">
            <input type="checkbox" name="createNewBranch" checked />
            Create new branch
          </label>
          <button
            type="button"
            class="btn btn-primary"
            hx-post="/create-worktree"
            hx-include="#create-worktree-form"
            hx-target="#worktree-result"
            hx-swap="innerHTML"
          >
            Create Worktree
          </button>
        </div>
        <div id="worktree-result" class="worktree-result"></div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          const branchInput = document.getElementById('branchName');
          const pathInput = document.getElementById('worktreePath');
          const worktreeBaseDir = ${JSON.stringify(worktreeBaseDir)};
          const repoName = ${JSON.stringify(repoName)};

          branchInput.addEventListener('input', function() {
            const currentPath = pathInput.value.trim();
            // パスが空の場合のみ自動生成（ユーザーが何か入力していたらそのまま保持）
            if (!currentPath) {
              const branchName = this.value.trim();
              if (branchName) {
                // ブランチ名からパスを生成（スラッシュをハイフンに変換）
                const safeBranchName = branchName.replace(/\\//g, '-');
                pathInput.value = worktreeBaseDir + '/' + repoName + '-' + safeBranchName;
              }
            }
          });
        })();
      `}} />
    </div>
  );
};
