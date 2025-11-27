// 操作結果表示コンポーネント
import type { FC } from "hono/jsx";

// パッチ適用結果表示
export const ApplyResult: FC<{
  success: boolean;
  output: string;
  isPreview?: boolean;
}> = ({ success, output, isPreview }) => (
  <div class={`apply-result ${success ? "success" : "error"}`}>
    <div class="result-header">
      {success
        ? isPreview
          ? "✓ Preview: Patch can be applied"
          : "✓ Patch applied successfully"
        : "✗ Failed to apply patch"}
    </div>
    {output && <pre class="result-output">{output}</pre>}
  </div>
);

// Worktree操作結果
export const WorktreeResult: FC<{
  success: boolean;
  output: string;
}> = ({ success, output }) => (
  <div class={`apply-result ${success ? "success" : "error"}`}>
    <div class="result-header">
      {success ? "✓ Success" : "✗ Failed"}
    </div>
    <pre class="result-output">{output}</pre>
  </div>
);

// マージ結果
export const MergeResult: FC<{
  success: boolean;
  output: string;
  hasConflicts?: boolean;
  repoPath?: string;
}> = ({ success, output, hasConflicts, repoPath }) => (
  <div class={`apply-result ${success ? "success" : "error"}`}>
    <div class="result-header">
      {success ? "✓ Merge successful" : hasConflicts ? "⚠ Merge conflicts" : "✗ Merge failed"}
    </div>
    <pre class="result-output">{output}</pre>
    {hasConflicts && repoPath && (
      <div class="conflict-actions">
        <p>Resolve conflicts manually, then commit. Or abort the merge:</p>
        <form class="inline-form" hx-post="/abort-merge" hx-target="#merge-result" hx-swap="innerHTML">
          <input type="hidden" name="repoPath" value={repoPath} />
          <button type="submit" class="btn btn-danger">
            Abort Merge
          </button>
        </form>
      </div>
    )}
  </div>
);

// ブランチ切り替え結果
export const CheckoutResult: FC<{
  success: boolean;
  output: string;
}> = ({ success, output }) => (
  <div class={`apply-result ${success ? "success" : "error"}`}>
    <div class="result-header">
      {success ? "✓ Branch switched" : "✗ Failed to switch branch"}
    </div>
    <pre class="result-output">{output}</pre>
  </div>
);
