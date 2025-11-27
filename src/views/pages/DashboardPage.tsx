// Hunk選択ダッシュボードページ
import type { FC } from "hono/jsx";
import type { WorktreeDiff, FoundRepository } from "../../git";
import { Layout } from "../Layout";
import { WorktreeCardHunkMode } from "../components";

export const HunkSelectDashboard: FC<{
  repoPath: string;
  baseBranch: string;
  diffs: WorktreeDiff[];
  repositories: FoundRepository[];
}> = ({ repoPath, baseBranch, diffs, repositories }) => (
  <Layout title="Worktree Diff Viewer">
    <div class="config-bar">
      <form hx-get="/" hx-target="body" hx-swap="outerHTML" class="config-form">
        <label>
          Repository:
          <select
            name="repo"
            class="repo-select"
            hx-get="/"
            hx-target="body"
            hx-swap="outerHTML"
            hx-trigger="change"
          >
            {repositories.length > 0 ? (
              repositories.map((repo) => (
                <option value={repo.path} selected={repo.path === repoPath}>
                  {repo.name} {repo.hasWorktrees ? "(has worktrees)" : ""}
                </option>
              ))
            ) : (
              <option value={repoPath}>{repoPath}</option>
            )}
          </select>
        </label>
        <span class="current-branch-label">
          Current: <code>{baseBranch}</code>
        </span>
        <button type="submit">Refresh</button>
        <a href={`/manage?repo=${encodeURIComponent(repoPath)}`} class="btn btn-outline">
          Manage Worktrees
        </a>
      </form>
    </div>

    <div class="mode-info">
      <p>ファイルをクリックして、取り込みたいhunk（変更ブロック）を選択してください。</p>
    </div>

    <div class="worktree-columns">
      {diffs.length > 0 ? (
        diffs.map((diff, index) => (
          <WorktreeCardHunkMode
            diff={diff}
            repoPath={repoPath}
            baseBranch={baseBranch}
            index={index}
          />
        ))
      ) : (
        <div class="empty-state">
          <p>No worktrees found.</p>
          <p>リポジトリパスを入力して Refresh してください。</p>
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{ __html: `
      function selectAllHunks(formId) {
        const form = document.getElementById(formId);
        if (form) {
          form.querySelectorAll('input[name="selectedHunks"]').forEach(cb => cb.checked = true);
        }
      }
      function deselectAllHunks(formId) {
        const form = document.getElementById(formId);
        if (form) {
          form.querySelectorAll('input[name="selectedHunks"]').forEach(cb => cb.checked = false);
        }
      }
    `}} />
  </Layout>
);
