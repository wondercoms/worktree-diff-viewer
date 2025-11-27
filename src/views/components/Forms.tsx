// フォームコンポーネント
import type { FC } from "hono/jsx";

// Worktree作成フォーム
export const CreateWorktreeForm: FC<{
  repoPath: string;
}> = ({ repoPath }) => (
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
            placeholder="../my-app-agent"
            required
          />
        </label>
        <label>
          Branch Name:
          <input
            type="text"
            name="branchName"
            placeholder="feature/agent-task"
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
  </div>
);
