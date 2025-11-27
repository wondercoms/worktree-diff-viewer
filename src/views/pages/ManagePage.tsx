// Worktree管理ページ
import type { FC } from "hono/jsx";
import type { Worktree } from "../../git";
import { Layout, agentColors } from "../Layout";
import { CreateWorktreeForm } from "../components";

export const WorktreeManagePage: FC<{
  repoPath: string;
  currentBranch: string;
  branches: string[];
  worktrees: Worktree[];
  hasUncommitted: boolean;
  selectedWorktrees: string[];
}> = ({ repoPath, currentBranch, branches, worktrees, hasUncommitted, selectedWorktrees }) => (
  <Layout title="Worktree Diff Viewer - Manage Worktrees">
    <div class="config-bar">
      <form hx-get="/manage" hx-target="body" hx-swap="outerHTML" class="config-form">
        <label>
          Repository:
          <input type="text" name="repo" value={repoPath} placeholder="/path/to/repo" />
        </label>
        <button type="submit">Refresh</button>
        <a href={`/?repo=${encodeURIComponent(repoPath)}`} class="btn btn-secondary">
          Back to Main
        </a>
      </form>
    </div>

    <div class="current-branch-section">
      <div class="current-branch-info">
        <span>Current branch (merge target):</span>
        <code>{currentBranch}</code>
        {hasUncommitted && (
          <span class="uncommitted-warning">⚠ Uncommitted changes</span>
        )}
      </div>
      <form class="branch-switcher" hx-post="/checkout-branch" hx-target="#checkout-result" hx-swap="innerHTML">
        <input type="hidden" name="repoPath" value={repoPath} />
        <label>
          Switch to:
          <select
            name="branchSelect"
            id="branch-select"
            hx-confirm="Switch branch? Make sure you have no uncommitted changes."
          >
            <option value="">-- Select branch --</option>
            {branches.map((branch) => (
              <option
                value={branch}
                selected={branch === currentBranch}
                disabled={branch === currentBranch}
              >
                {branch} {branch === currentBranch ? "(current)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" class="btn btn-sm">Switch</button>
      </form>
      <div id="checkout-result" class="checkout-result"></div>
    </div>

    <CreateWorktreeForm repoPath={repoPath} />

    <div class="worktree-list-section">
      <h3>Existing Worktrees</h3>
      <p class="section-description">Select worktrees to display on the main page:</p>
      <div id="merge-result" class="merge-result-container"></div>
      <div class="worktree-table">
        <div class="worktree-table-header">
          <span>Display</span>
          <span>Path</span>
          <span>Branch</span>
          <span>Agent</span>
          <span>Actions</span>
        </div>
        {worktrees.map((wt) => (
          <div class="worktree-table-row" key={wt.path}>
            <span class="worktree-display-check">
              {wt.branch !== currentBranch && (
                <input
                  type="checkbox"
                  name="selected"
                  value={wt.branch}
                  checked={selectedWorktrees.includes(wt.branch)}
                  class="worktree-checkbox"
                  form="worktree-selection-form"
                />
              )}
            </span>
            <span class="worktree-path">{wt.path}</span>
            <span class="worktree-branch">{wt.branch}</span>
            <span class="worktree-agent">
              <span
                class="agent-tag"
                style={`background: ${agentColors[wt.agent || "Agent"] || agentColors.Agent}`}
              >
                {wt.agent || "Agent"}
              </span>
            </span>
            <span class="worktree-actions">
              {wt.branch !== currentBranch && (
                <>
                  <form class="inline-form" hx-post="/merge-branch" hx-target="#merge-result" hx-swap="innerHTML">
                    <input type="hidden" name="repoPath" value={repoPath} />
                    <input type="hidden" name="branchName" value={wt.branch} />
                    <button
                      type="submit"
                      class="btn btn-primary btn-sm"
                      hx-confirm={`Merge ${wt.branch} into ${currentBranch}?`}
                    >
                      Merge
                    </button>
                  </form>
                  <form class="inline-form" hx-post="/remove-worktree" hx-target="#worktree-result" hx-swap="innerHTML">
                    <input type="hidden" name="repoPath" value={repoPath} />
                    <input type="hidden" name="worktreePath" value={wt.path} />
                    <button
                      type="submit"
                      class="btn btn-danger btn-sm"
                      hx-confirm={`Remove worktree at ${wt.path}?`}
                    >
                      Remove
                    </button>
                  </form>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <form id="worktree-selection-form" method="post" action="/save-selection">
        <input type="hidden" name="repoPath" value={repoPath} />
        <div class="selection-actions">
          <button type="submit" class="btn btn-primary">
            Apply Selection & View Diffs
          </button>
          <button type="button" class="btn btn-secondary" onclick="selectAllWorktrees()">
            Select All
          </button>
          <button type="button" class="btn btn-secondary" onclick="deselectAllWorktrees()">
            Deselect All
          </button>
        </div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `
        function selectAllWorktrees() {
          document.querySelectorAll('.worktree-checkbox').forEach(cb => cb.checked = true);
        }
        function deselectAllWorktrees() {
          document.querySelectorAll('.worktree-checkbox').forEach(cb => cb.checked = false);
        }
      `}} />
    </div>
  </Layout>
);
