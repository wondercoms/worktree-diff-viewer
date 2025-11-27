// Viewer設定ファイル（.git/worktree-viewer.json）
import type { ViewerSettings } from "./types";

const SETTINGS_FILE_NAME = "worktree-viewer.json";

// .gitディレクトリのパスを取得
async function getGitDirPath(repoPath: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "rev-parse", "--git-dir"], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;

    const gitDir = (await new Response(proc.stdout).text()).trim();
    // 相対パスの場合は絶対パスに変換
    if (gitDir.startsWith("/")) {
      return gitDir;
    }
    return `${repoPath}/${gitDir}`;
  } catch {
    return null;
  }
}

// 設定ファイルのパスを取得
async function getSettingsFilePath(repoPath: string): Promise<string | null> {
  const gitDir = await getGitDirPath(repoPath);
  if (!gitDir) return null;
  return `${gitDir}/${SETTINGS_FILE_NAME}`;
}

// 設定を読み込み
export async function loadViewerSettings(repoPath: string): Promise<ViewerSettings> {
  const defaultSettings: ViewerSettings = {
    selectedWorktrees: [],
  };

  try {
    const settingsPath = await getSettingsFilePath(repoPath);
    if (!settingsPath) return defaultSettings;

    const file = Bun.file(settingsPath);
    if (!(await file.exists())) {
      return defaultSettings;
    }

    const content = await file.text();
    const settings = JSON.parse(content) as ViewerSettings;
    return {
      ...defaultSettings,
      ...settings,
    };
  } catch {
    return defaultSettings;
  }
}

// 設定を保存
export async function saveViewerSettings(
  repoPath: string,
  settings: ViewerSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const settingsPath = await getSettingsFilePath(repoPath);
    if (!settingsPath) {
      return { success: false, error: "Could not find .git directory" };
    }

    await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 選択されたworktreeを保存
export async function saveSelectedWorktrees(
  repoPath: string,
  selectedWorktrees: string[]
): Promise<{ success: boolean; error?: string }> {
  const settings = await loadViewerSettings(repoPath);
  settings.selectedWorktrees = selectedWorktrees;
  return saveViewerSettings(repoPath, settings);
}

// 選択されたworktreeを読み込み
export async function loadSelectedWorktrees(repoPath: string): Promise<string[]> {
  const settings = await loadViewerSettings(repoPath);
  return settings.selectedWorktrees;
}
