// Worktree関連の型定義

export interface Worktree {
  path: string;
  branch: string;
  head: string;
  agent?: string; // claude, gemini, codex など
}

export interface FileDiff {
  file: string;
  insertions: number;
  deletions: number;
  status: "added" | "modified" | "deleted" | "renamed";
}

// Hunk（変更ブロック）を表す型
export interface Hunk {
  id: string; // ユニークID（ファイルパス + インデックス）
  header: string; // @@ -x,y +a,b @@ ...
  startLineOld: number;
  countOld: number;
  startLineNew: number;
  countNew: number;
  content: string; // hunk全体のテキスト（headerを含む）
  lines: string[]; // 各行
}

// ファイル単位のhunk情報
export interface FileHunks {
  file: string;
  oldFile: string; // rename時のため
  newFile: string;
  hunks: Hunk[];
  header: string; // diff --git a/... b/... の部分
}

export interface WorktreeDiff {
  worktree: Worktree;
  files: FileDiff[];
  totalInsertions: number;
  totalDeletions: number;
}

// Gitリポジトリを検索
export interface FoundRepository {
  path: string;
  name: string;
  hasWorktrees: boolean;
}

// Viewer設定
export interface ViewerSettings {
  selectedWorktrees: string[];
}

// 操作結果
export interface OperationResult {
  success: boolean;
  output: string;
}

export interface MergeResult extends OperationResult {
  hasConflicts: boolean;
}
