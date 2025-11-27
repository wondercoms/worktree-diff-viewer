// リポジトリ検索
import type { FoundRepository } from "./types";

// DEFAULT_BASE_PATH配下のGitリポジトリを探索
export async function findGitRepositories(
  maxDepth: number = 4
): Promise<FoundRepository[]> {
  const basePath = process.env.DEFAULT_BASE_PATH;

  // DEFAULT_BASE_PATHが設定されていない場合は空のリストを返す
  if (!basePath) {
    return [];
  }

  const basePaths = [basePath];

  // 除外するディレクトリ
  const excludeDirs = new Set([
    "node_modules",
    ".npm",
    ".cache",
    ".local",
    ".config",
    "Library",
    "Applications",
    ".Trash",
    "Music",
    "Movies",
    "Pictures",
    ".git",
    "vendor",
    "dist",
    "build",
    ".vscode",
    ".idea",
  ]);

  const repositories: FoundRepository[] = [];
  const visited = new Set<string>();

  // .gitがファイルの場合はworktree（ディレクトリの場合は通常のリポジトリ）
  async function isGitRepo(dirPath: string): Promise<{ isRepo: boolean; isWorktree: boolean }> {
    try {
      const gitPath = `${dirPath}/.git`;

      // .gitがディレクトリかチェック（通常のリポジトリ）
      const checkDirProc = Bun.spawn(["test", "-d", gitPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if ((await checkDirProc.exited) === 0) {
        return { isRepo: true, isWorktree: false };
      }

      // .gitがファイルかチェック（worktree）
      const checkFileProc = Bun.spawn(["test", "-f", gitPath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if ((await checkFileProc.exited) === 0) {
        return { isRepo: true, isWorktree: true };
      }

      return { isRepo: false, isWorktree: false };
    } catch {
      return { isRepo: false, isWorktree: false };
    }
  }

  async function hasWorktreesInRepo(repoPath: string): Promise<boolean> {
    try {
      const proc = Bun.spawn(["git", "worktree", "list"], {
        cwd: repoPath,
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdout = await new Response(proc.stdout).text();
      const lines = stdout.trim().split("\n").filter(l => l);
      return lines.length > 1; // メインのworktree以外がある
    } catch {
      return false;
    }
  }

  async function scanDirectory(dirPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    if (visited.has(dirPath)) return;
    visited.add(dirPath);

    try {
      // まずこのディレクトリがgitリポジトリかチェック
      const { isRepo, isWorktree } = await isGitRepo(dirPath);
      if (isRepo) {
        // worktreeは除外し、通常のリポジトリのみ追加
        if (!isWorktree) {
          const name = dirPath.split("/").pop() || dirPath;
          const hasWorktrees = await hasWorktreesInRepo(dirPath);
          repositories.push({ path: dirPath, name, hasWorktrees });
        }
        return; // gitリポジトリ/worktree内はこれ以上探索しない
      }

      // サブディレクトリを探索
      const proc = Bun.spawn(["ls", "-1"], {
        cwd: dirPath,
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdout = await new Response(proc.stdout).text();
      const entries = stdout.trim().split("\n").filter(e => e);

      const promises: Promise<void>[] = [];
      for (const entry of entries) {
        if (excludeDirs.has(entry)) continue;
        if (entry.startsWith(".") && entry !== ".git") continue;

        const fullPath = `${dirPath}/${entry}`;

        try {
          // ディレクトリかどうかチェック
          const checkProc = Bun.spawn(["test", "-d", fullPath], {
            stdout: "pipe",
            stderr: "pipe",
          });
          const isDir = (await checkProc.exited) === 0;
          if (isDir) {
            promises.push(scanDirectory(fullPath, depth + 1));
          }
        } catch {
          // skip
        }
      }

      await Promise.all(promises);
    } catch {
      // ディレクトリにアクセスできない場合はスキップ
    }
  }

  // 存在するパスのみ探索
  const existingPaths: string[] = [];
  for (const basePath of basePaths) {
    try {
      const checkProc = Bun.spawn(["test", "-d", basePath], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if ((await checkProc.exited) === 0) {
        existingPaths.push(basePath);
      }
    } catch {
      // skip
    }
  }

  // 並列で探索
  await Promise.all(existingPaths.map(p => scanDirectory(p, 0)));

  // 名前でソート、worktreeがあるものを優先
  repositories.sort((a, b) => {
    if (a.hasWorktrees !== b.hasWorktrees) {
      return a.hasWorktrees ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return repositories;
}

// キャッシュ付きリポジトリ検索
let repositoryCache: FoundRepository[] | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分

export async function findGitRepositoriesCached(): Promise<FoundRepository[]> {
  const now = Date.now();
  if (repositoryCache && (now - cacheTime) < CACHE_TTL) {
    return repositoryCache;
  }

  repositoryCache = await findGitRepositories();
  cacheTime = now;
  return repositoryCache;
}

// キャッシュをクリア
export function clearRepositoryCache(): void {
  repositoryCache = null;
  cacheTime = 0;
}
