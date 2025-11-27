// パッチ生成・適用
import { $ } from "bun";
import type { FileHunks, OperationResult } from "./types";

// 新規ファイル追加かどうかを判定
export function isNewFile(fileHunks: FileHunks): boolean {
  // 最初のhunkが @@ -0,0 で始まる場合は新規ファイル
  if (fileHunks.hunks.length > 0) {
    const firstHunk = fileHunks.hunks[0];
    return firstHunk.startLineOld === 0 && firstHunk.countOld === 0;
  }
  return false;
}

// 選択されたhunkからパッチを生成
export function generatePatch(
  fileHunks: FileHunks,
  selectedHunkIds: string[]
): string {
  const selectedHunks = fileHunks.hunks.filter(h => selectedHunkIds.includes(h.id));
  if (selectedHunks.length === 0) return "";

  const lines: string[] = [];
  const isNew = isNewFile(fileHunks);

  // ファイルヘッダー
  lines.push(`diff --git a/${fileHunks.oldFile} b/${fileHunks.newFile}`);

  if (isNew) {
    lines.push("new file mode 100644");
    lines.push("--- /dev/null");
  } else {
    lines.push(`--- a/${fileHunks.oldFile}`);
  }
  lines.push(`+++ b/${fileHunks.newFile}`);

  // 選択されたhunk
  for (const hunk of selectedHunks) {
    lines.push(hunk.content);
  }

  return lines.join("\n") + "\n";
}

// 複数ファイルのパッチを結合
export function generateMultiFilePatch(
  patches: { fileHunks: FileHunks; selectedHunkIds: string[] }[]
): string {
  const result: string[] = [];

  for (const { fileHunks, selectedHunkIds } of patches) {
    const patch = generatePatch(fileHunks, selectedHunkIds);
    if (patch) {
      result.push(patch);
    }
  }

  return result.join("\n");
}

// パッチを適用
export async function applyPatch(
  targetPath: string,
  patch: string,
  dryRun: boolean = false
): Promise<OperationResult> {
  // パッチを一時ファイルに書き出し
  const tempFile = `/tmp/patch-${Date.now()}.patch`;
  await Bun.write(tempFile, patch);

  try {
    // git apply を実行
    const args = dryRun ? ["apply", "--check", tempFile] : ["apply", tempFile];
    const proc = Bun.spawn(["git", ...args], {
      cwd: targetPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    // 一時ファイルを削除
    await $`rm ${tempFile}`.quiet();

    if (exitCode === 0) {
      return { success: true, output: stdout || "Patch applied successfully" };
    } else {
      return { success: false, output: stderr || stdout || `Failed with exit code ${exitCode}` };
    }
  } catch (error: any) {
    // 一時ファイルを削除
    await $`rm ${tempFile}`.quiet();
    return {
      success: false,
      output: error.message || "Failed to apply patch"
    };
  }
}

// パッチをプレビュー（適用後の結果を表示）
export async function previewPatch(
  targetPath: string,
  patch: string
): Promise<OperationResult> {
  return applyPatch(targetPath, patch, true);
}
