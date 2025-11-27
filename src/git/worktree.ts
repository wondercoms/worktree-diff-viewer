import { $ } from "bun";

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

export interface WorktreeDiff {
  worktree: Worktree;
  files: FileDiff[];
  totalInsertions: number;
  totalDeletions: number;
}

// エージェント名を推測（ブランチ名やパスから）
function detectAgent(worktree: Worktree): string {
  const name = worktree.path.toLowerCase() + worktree.branch.toLowerCase();
  if (name.includes("claude")) return "Claude";
  if (name.includes("gemini")) return "Gemini";
  if (name.includes("codex") || name.includes("codec")) return "Codex";
  if (name.includes("copilot")) return "Copilot";
  return "Agent";
}

// worktree一覧を取得
export async function listWorktrees(repoPath: string): Promise<Worktree[]> {
  try {
    const result = await $`cd ${repoPath} && git worktree list --porcelain`.text();
    const worktrees: Worktree[] = [];
    let current: Partial<Worktree> = {};

    for (const line of result.split("\n")) {
      if (line.startsWith("worktree ")) {
        current.path = line.replace("worktree ", "");
      } else if (line.startsWith("HEAD ")) {
        current.head = line.replace("HEAD ", "");
      } else if (line.startsWith("branch ")) {
        current.branch = line.replace("branch ", "").replace("refs/heads/", "");
      } else if (line === "") {
        if (current.path && current.head) {
          const wt = current as Worktree;
          wt.agent = detectAgent(wt);
          worktrees.push(wt);
        }
        current = {};
      }
    }

    return worktrees;
  } catch (error) {
    console.error("Failed to list worktrees:", error);
    return [];
  }
}

// 指定worktreeとベースブランチの差分を取得
export async function getWorktreeDiff(
  repoPath: string,
  worktree: Worktree,
  baseBranch: string = "main"
): Promise<WorktreeDiff> {
  try {
    // マージベースを取得
    const mergeBase = await $`cd ${worktree.path} && git merge-base ${baseBranch} HEAD`.text();
    const base = mergeBase.trim();

    // 差分統計を取得
    const diffStat = await $`cd ${worktree.path} && git diff --numstat ${base}`.text();
    
    const files: FileDiff[] = [];
    let totalInsertions = 0;
    let totalDeletions = 0;

    for (const line of diffStat.split("\n")) {
      if (!line.trim()) continue;
      const [ins, del, file] = line.split("\t");
      const insertions = ins === "-" ? 0 : parseInt(ins, 10);
      const deletions = del === "-" ? 0 : parseInt(del, 10);
      
      files.push({
        file,
        insertions,
        deletions,
        status: "modified", // 簡略化
      });
      
      totalInsertions += insertions;
      totalDeletions += deletions;
    }

    return {
      worktree,
      files,
      totalInsertions,
      totalDeletions,
    };
  } catch (error) {
    console.error(`Failed to get diff for ${worktree.path}:`, error);
    return {
      worktree,
      files: [],
      totalInsertions: 0,
      totalDeletions: 0,
    };
  }
}

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

// コンフリクトの可能性があるファイルを検出
export async function detectPotentialConflicts(
  diffs: WorktreeDiff[]
): Promise<Map<string, string[]>> {
  const fileToAgents = new Map<string, string[]>();

  for (const diff of diffs) {
    for (const file of diff.files) {
      const agents = fileToAgents.get(file.file) || [];
      agents.push(diff.worktree.agent || "Unknown");
      fileToAgents.set(file.file, agents);
    }
  }

  // 複数エージェントが触っているファイルのみ返す
  const conflicts = new Map<string, string[]>();
  for (const [file, agents] of fileToAgents) {
    if (agents.length > 1) {
      conflicts.set(file, agents);
    }
  }

  return conflicts;
}
