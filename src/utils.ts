// ユーティリティ関数
import { createError, wrapError } from "./errors.ts";

/**
 * ファイル名がテストファイルかどうかを判定
 */
export function isTestFile(fileName: string): boolean {
  try {
    if (!fileName || typeof fileName !== 'string') {
      throw createError('INVALID_FILE_PATH', 'File name must be a string', { fileName });
    }
    return /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(fileName);
  } catch (error) {
    if (error instanceof Error && error.name === 'SnapshotRunnerError') {
      throw error;
    }
    throw wrapError(error, 'INVALID_FILE_PATH');
  }
}

/**
 * ファイル内容とカーソル位置からテスト名を検出
 */
export function getTestAtCursor(
  fileName: string,
  cursorLine: number,
  fileContent: string[]
): string | null {
  try {
    // テストファイルでない場合はnullを返す
    if (!isTestFile(fileName)) {
      return null;
    }
    
    if (!Array.isArray(fileContent) || fileContent.length === 0) {
      throw createError('FILE_READ_ERROR', 'File content is empty or invalid');
    }
    
    if (!Number.isInteger(cursorLine) || cursorLine < 1 || cursorLine > fileContent.length) {
      throw createError('INVALID_LINE_NUMBER', `Cursor line ${cursorLine} is out of bounds`);
    }
    
    // カーソル位置から上方向にテスト名を探す
    let testName: string | null = null;
    let searchLine = cursorLine - 1; // 0-indexed
    
    while (searchLine >= 0 && !testName) {
      const lineContent = fileContent[searchLine];
      
      // Jest/Vitest形式のテストを検出
      const testMatch = lineContent.match(/^\s*(it|test|describe)\s*\(\s*['"`](.+?)['"`]/);
      if (testMatch && (testMatch[1] === 'it' || testMatch[1] === 'test')) {
        testName = testMatch[2];
        break;
      }
      
      searchLine--;
    }
    
    return testName;
  } catch (error) {
    if (error instanceof Error && error.name === 'SnapshotRunnerError') {
      // Our custom errors should be re-thrown
      throw error;
    }
    throw wrapError(error, 'UNEXPECTED_ERROR');
  }
}

/**
 * プロジェクトディレクトリからパッケージマネージャーを検出
 */
export async function detectPackageManager(cwd: string): Promise<string> {
  try {
    if (!cwd || typeof cwd !== 'string') {
      throw createError('INVALID_FILE_PATH', 'Working directory must be a string', { cwd });
    }
    
    const managers = [
      { lockFile: "package-lock.json", command: "npm" },
      { lockFile: "yarn.lock", command: "yarn" },
      { lockFile: "pnpm-lock.yaml", command: "pnpm" },
    ];
    
    for (const manager of managers) {
      try {
        const stat = await Deno.stat(`${cwd}/${manager.lockFile}`);
        if (stat.isFile) {
          return manager.command;
        }
      } catch {
        // ファイルが存在しない場合は続行
      }
    }
    
    return "npm"; // デフォルト
  } catch (error) {
    if (error instanceof Error && error.name === 'SnapshotRunnerError') {
      throw error;
    }
    throw wrapError(error, 'PACKAGE_MANAGER_ERROR');
  }
}