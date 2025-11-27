// Hunk選択関連コンポーネント
import type { FC } from "hono/jsx";
import type { FileHunks, Hunk, WorktreeDiff } from "../../git";
import { agentColors } from "../Layout";

// Hunkの色付け表示
function colorizedHunk(hunk: Hunk): any {
  return hunk.lines.map((line, i) => {
    let className = "diff-line";
    if (line.startsWith("+") && !line.startsWith("+++")) {
      className += " diff-add";
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      className += " diff-remove";
    } else if (line.startsWith("@@")) {
      className += " diff-hunk-header";
    }
    return <div class={className} key={i}>{line}</div>;
  });
}

// Hunk選択UI付きの差分詳細パネル
export const HunkSelector: FC<{
  fileHunks: FileHunks;
  worktreePath: string;
  repoPath: string;
  baseBranch: string;
}> = ({ fileHunks, worktreePath, repoPath, baseBranch }) => {
  const formId = `hunk-form-${fileHunks.file.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <div class="hunk-selector">
      <div class="hunk-header">
        <h3>{fileHunks.file}</h3>
        <span class="hunk-count">{fileHunks.hunks.length} hunks</span>
      </div>

      <form id={formId} class="hunk-form">
        <input type="hidden" name="worktreePath" value={worktreePath} />
        <input type="hidden" name="repoPath" value={repoPath} />
        <input type="hidden" name="baseBranch" value={baseBranch} />
        <input type="hidden" name="file" value={fileHunks.file} />

        <div class="hunk-list">
          {fileHunks.hunks.map((hunk, index) => (
            <div class="hunk-item" key={hunk.id}>
              <label class="hunk-checkbox-label">
                <input
                  type="checkbox"
                  name="selectedHunks"
                  value={hunk.id}
                  class="hunk-checkbox"
                />
                <span class="hunk-info">
                  <span class="hunk-index">#{index + 1}</span>
                  <span class="hunk-location">
                    Lines {hunk.startLineNew}-{hunk.startLineNew + hunk.countNew - 1}
                  </span>
                </span>
              </label>
              <pre class="hunk-preview">{colorizedHunk(hunk)}</pre>
            </div>
          ))}
        </div>

        <div class="hunk-actions">
          <button
            type="button"
            class="btn btn-secondary select-all"
            onclick={`selectAllHunks('${formId}')`}
          >
            Select All
          </button>
          <button
            type="button"
            class="btn btn-secondary deselect-all"
            onclick={`deselectAllHunks('${formId}')`}
          >
            Deselect All
          </button>
          <button
            type="button"
            class="btn btn-primary apply-btn"
            hx-post="/apply-hunks"
            hx-include={`#${formId}`}
            hx-target={`#result-${formId}`}
            hx-swap="innerHTML"
          >
            Apply Selected Hunks
          </button>
          <button
            type="button"
            class="btn btn-outline preview-btn"
            hx-post="/preview-hunks"
            hx-include={`#${formId}`}
            hx-target={`#result-${formId}`}
            hx-swap="innerHTML"
          >
            Preview
          </button>
        </div>

        <div id={`result-${formId}`} class="hunk-result"></div>
      </form>
    </div>
  );
};

// Hunk選択モード用のファイル一覧表示
export const HunkModeFileList: FC<{
  diff: WorktreeDiff;
  repoPath: string;
  baseBranch: string;
  index: number;
}> = ({ diff, repoPath, baseBranch, index }) => {
  const panelId = `hunk-panel-${index}`;

  return (
    <div class="file-list hunk-mode">
      {diff.files.map((file) => (
        <div
          class="file-item"
          hx-get={`/hunk-selector?worktreePath=${encodeURIComponent(diff.worktree.path)}&file=${encodeURIComponent(file.file)}&repoPath=${encodeURIComponent(repoPath)}&base=${encodeURIComponent(baseBranch)}`}
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
  );
};

// Hunk選択モード用のWorktreeカード
export const WorktreeCardHunkMode: FC<{
  diff: WorktreeDiff;
  repoPath: string;
  baseBranch: string;
  index: number;
}> = ({ diff, repoPath, baseBranch, index }) => {
  const agent = diff.worktree.agent || "Agent";
  const color = agentColors[agent] || agentColors.Agent;
  const panelId = `hunk-panel-${index}`;

  return (
    <div class="worktree-column hunk-mode" style={`--agent-color: ${color}`}>
      <div class="column-header">
        <span class="agent-badge">{agent}</span>
        <span class="branch-name">{diff.worktree.branch}</span>
        <div class="card-stats">
          <span class="stat insertions">+{diff.totalInsertions}</span>
          <span class="stat deletions">-{diff.totalDeletions}</span>
          <span class="stat files">{diff.files.length} files</span>
        </div>
      </div>
      <HunkModeFileList
        diff={diff}
        repoPath={repoPath}
        baseBranch={baseBranch}
        index={index}
      />
      <div id={panelId} class="diff-panel hunk-panel">
        <p class="placeholder">ファイルをクリックしてhunkを選択してください</p>
      </div>
    </div>
  );
};
