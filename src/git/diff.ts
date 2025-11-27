// Diff/Hunk操作
import { $ } from "bun";
import type { Hunk, FileHunks } from "./types";

// ファイルの実際の差分内容を取得
export async function getFileDiff(
  worktreePath: string,
  filePath: string,
  baseBranch: string = "main"
): Promise<string> {
  try {
    const mergeBase = await $`cd ${worktreePath} && git merge-base ${baseBranch} HEAD`.text();
    const diff = await $`cd ${worktreePath} && git diff ${mergeBase.trim()} -- ${filePath}`.text();
    return diff;
  } catch (error) {
    return `Error getting diff: ${error}`;
  }
}

// diff出力をhunk単位でパースする
export function parseDiffToHunks(diffOutput: string, filePath: string): FileHunks {
  const lines = diffOutput.split("\n");
  const hunks: Hunk[] = [];

  let header = "";
  let oldFile = filePath;
  let newFile = filePath;
  let currentHunkLines: string[] = [];
  let currentHunkHeader = "";
  let hunkIndex = 0;
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // diff --git ヘッダー
    if (line.startsWith("diff --git")) {
      header = line;
      continue;
    }

    // --- a/file
    if (line.startsWith("--- ")) {
      const match = line.match(/^--- a\/(.+)$/);
      if (match) oldFile = match[1];
      continue;
    }

    // +++ b/file
    if (line.startsWith("+++ ")) {
      const match = line.match(/^\+\+\+ b\/(.+)$/);
      if (match) newFile = match[1];
      continue;
    }

    // index, mode などのメタ行はスキップ
    if (line.startsWith("index ") || line.startsWith("new file") ||
        line.startsWith("deleted file") || line.startsWith("old mode") ||
        line.startsWith("new mode") || line.startsWith("similarity") ||
        line.startsWith("rename from") || line.startsWith("rename to") ||
        line.startsWith("Binary files")) {
      continue;
    }

    // @@ hunkヘッダー
    if (line.startsWith("@@")) {
      // 前のhunkを保存
      if (inHunk && currentHunkLines.length > 0) {
        const hunk = parseHunkHeader(currentHunkHeader, currentHunkLines, filePath, hunkIndex);
        if (hunk) {
          hunks.push(hunk);
          hunkIndex++;
        }
      }

      currentHunkHeader = line;
      currentHunkLines = [line];
      inHunk = true;
      continue;
    }

    // hunk内の行（+, -, 空白で始まる）
    if (inHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ") || line === "")) {
      currentHunkLines.push(line);
    }
  }

  // 最後のhunkを保存
  if (inHunk && currentHunkLines.length > 0) {
    const hunk = parseHunkHeader(currentHunkHeader, currentHunkLines, filePath, hunkIndex);
    if (hunk) {
      hunks.push(hunk);
    }
  }

  return {
    file: filePath,
    oldFile,
    newFile,
    hunks,
    header,
  };
}

// hunkヘッダーをパースして情報を抽出
function parseHunkHeader(
  header: string,
  lines: string[],
  filePath: string,
  index: number
): Hunk | null {
  // @@ -startOld,countOld +startNew,countNew @@ context
  const match = header.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return null;

  const startLineOld = parseInt(match[1], 10);
  const countOld = match[2] ? parseInt(match[2], 10) : 1;
  const startLineNew = parseInt(match[3], 10);
  const countNew = match[4] ? parseInt(match[4], 10) : 1;

  return {
    id: `${filePath}:${index}`,
    header,
    startLineOld,
    countOld,
    startLineNew,
    countNew,
    content: lines.join("\n"),
    lines,
  };
}

// ファイルのhunk一覧を取得
export async function getFileHunks(
  worktreePath: string,
  filePath: string,
  baseBranch: string = "main"
): Promise<FileHunks> {
  try {
    const mergeBase = await $`cd ${worktreePath} && git merge-base ${baseBranch} HEAD`.text();
    const diff = await $`cd ${worktreePath} && git diff ${mergeBase.trim()} -- ${filePath}`.text();
    return parseDiffToHunks(diff, filePath);
  } catch (error) {
    return {
      file: filePath,
      oldFile: filePath,
      newFile: filePath,
      hunks: [],
      header: "",
    };
  }
}
