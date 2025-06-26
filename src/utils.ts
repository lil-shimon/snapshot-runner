// ユーティリティ関数

/**
 * ファイル名がテストファイルかどうかを判定
 */
export function isTestFile(fileName: string): boolean {
  return /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(fileName);
}

/**
 * ファイル内容とカーソル位置からテスト名を検出
 */
export function getTestAtCursor(
  fileName: string,
  cursorLine: number,
  fileContent: string[]
): string | null {
  // テストファイルでない場合はnullを返す
  if (!isTestFile(fileName)) {
    return null;
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
}

/**
 * プロジェクトディレクトリからパッケージマネージャーを検出
 */
export async function detectPackageManager(cwd: string): Promise<string> {
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
}