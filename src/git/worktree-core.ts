// Worktree操作のコア機能
import { $ } from "bun";
import type { Worktree, WorktreeDiff, FileDiff, OperationResult } from "./types";

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
    const result = await $`cd ${repoPath} && git worktree list --porcelain`.quiet().text();
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
    // Not a git repository or other error - return empty list
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

// 新しいworktreeを作成
export async function createWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string,
  createNewBranch: boolean = true
): Promise<OperationResult> {
  try {
    const args = createNewBranch
      ? ["worktree", "add", "-b", branchName, worktreePath]
      : ["worktree", "add", worktreePath, branchName];

    const proc = Bun.spawn(["git", ...args], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return { success: true, output: stdout || `Worktree created at ${worktreePath}` };
    } else {
      return { success: false, output: stderr || stdout || `Failed with exit code ${exitCode}` };
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.message || "Failed to create worktree"
    };
  }
}

// worktreeを削除
export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
  force: boolean = false
): Promise<OperationResult> {
  try {
    const args = force
      ? ["worktree", "remove", "--force", worktreePath]
      : ["worktree", "remove", worktreePath];

    const proc = Bun.spawn(["git", ...args], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return { success: true, output: stdout || `Worktree removed: ${worktreePath}` };
    } else {
      return { success: false, output: stderr || stdout || `Failed with exit code ${exitCode}` };
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.message || "Failed to remove worktree"
    };
  }
}
