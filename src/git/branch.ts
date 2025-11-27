// ブランチ操作
import type { OperationResult, MergeResult } from "./types";

// ブランチ一覧を取得
export async function listBranches(
  repoPath: string
): Promise<{ local: string[]; remote: string[] }> {
  try {
    // ローカルブランチ
    const localProc = Bun.spawn(["git", "branch", "--format=%(refname:short)"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    const localOutput = await new Response(localProc.stdout).text();
    const local = localOutput.trim().split("\n").filter(b => b);

    // リモートブランチ
    const remoteProc = Bun.spawn(["git", "branch", "-r", "--format=%(refname:short)"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    const remoteOutput = await new Response(remoteProc.stdout).text();
    const remote = remoteOutput.trim().split("\n").filter(b => b && !b.includes("HEAD"));

    return { local, remote };
  } catch (error) {
    return { local: [], remote: [] };
  }
}

// ブランチをマージ
export async function mergeBranch(
  repoPath: string,
  branchName: string,
  noFastForward: boolean = false
): Promise<MergeResult> {
  try {
    const args = noFastForward
      ? ["merge", "--no-ff", branchName]
      : ["merge", branchName];

    const proc = Bun.spawn(["git", ...args], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    const output = stdout + stderr;
    const hasConflicts = output.includes("CONFLICT") || output.includes("Automatic merge failed");

    if (exitCode === 0) {
      return { success: true, output: output || `Merged ${branchName} successfully`, hasConflicts: false };
    } else {
      return { success: false, output, hasConflicts };
    }
  } catch (error: any) {
    return {
      success: false,
      output: error.message || "Failed to merge branch",
      hasConflicts: false
    };
  }
}

// マージを中止
export async function abortMerge(
  repoPath: string
): Promise<OperationResult> {
  try {
    const proc = Bun.spawn(["git", "merge", "--abort"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return { success: true, output: "Merge aborted" };
    } else {
      return { success: false, output: stderr || stdout };
    }
  } catch (error: any) {
    return { success: false, output: error.message };
  }
}

// 現在のブランチを取得
export async function getCurrentBranch(
  repoPath: string
): Promise<string> {
  try {
    const proc = Bun.spawn(["git", "branch", "--show-current"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      return "";
    }

    const stdout = await new Response(proc.stdout).text();
    return stdout.trim();
  } catch (error) {
    return "";
  }
}

// マージ状態を確認
export async function getMergeStatus(
  repoPath: string
): Promise<{ isMerging: boolean; conflictFiles: string[] }> {
  try {
    // MERGE_HEAD が存在するかチェック
    const mergeHeadProc = Bun.spawn(["git", "rev-parse", "--verify", "MERGE_HEAD"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    await mergeHeadProc.exited;
    const isMerging = (await mergeHeadProc.exited) === 0;

    // コンフリクトファイル一覧
    const conflictProc = Bun.spawn(["git", "diff", "--name-only", "--diff-filter=U"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    const conflictOutput = await new Response(conflictProc.stdout).text();
    const conflictFiles = conflictOutput.trim().split("\n").filter(f => f);

    return { isMerging, conflictFiles };
  } catch (error) {
    return { isMerging: false, conflictFiles: [] };
  }
}

// ブランチを切り替え
export async function checkoutBranch(
  repoPath: string,
  branchName: string
): Promise<OperationResult> {
  try {
    const proc = Bun.spawn(["git", "checkout", branchName], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode === 0) {
      return { success: true, output: stderr || stdout || `Switched to branch '${branchName}'` };
    } else {
      return { success: false, output: stderr || stdout };
    }
  } catch (error: any) {
    return { success: false, output: error.message };
  }
}

// ワーキングディレクトリの状態を確認
export async function getWorkingTreeStatus(
  repoPath: string
): Promise<{ isClean: boolean; hasUncommitted: boolean; changes: string[] }> {
  try {
    const proc = Bun.spawn(["git", "status", "--porcelain"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const changes = stdout.trim().split("\n").filter(l => l);
    const isClean = changes.length === 0;
    const hasUncommitted = !isClean;

    return { isClean, hasUncommitted, changes };
  } catch (error) {
    return { isClean: true, hasUncommitted: false, changes: [] };
  }
}
