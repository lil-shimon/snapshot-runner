// Denopsディスパッチャー関数（テスト可能な形で分離）
import { detectPackageManager, getTestAtCursor, isTestFile } from "./utils.ts";

export interface MockDenops {
  cmd(command: string): Promise<void>;
}

export interface FileInfo {
  fileName: string;
  currentLine: number;
  fileContent: string[];
}

export interface ExecuteCommandResult {
  success: boolean;
  message: string;
  command?: string[];
}

/**
 * スナップショットテストディスパッチャー（テスト可能バージョン）
 */
export async function snapshotTestDispatcher(
  cwd: string,
  fileInfo: FileInfo,
  mockDenops: MockDenops,
  executeCommand?: (cmd: string, args: string[], cwd: string) => Promise<ExecuteCommandResult>
): Promise<void> {
  const { fileName, currentLine, fileContent } = fileInfo;
  
  // テストファイルかチェック
  if (!isTestFile(fileName)) {
    await mockDenops.cmd('echohl WarningMsg | echo "⚠️  Not a test file" | echohl None');
    return;
  }
  
  // カーソル位置のテストを検出
  const testName = getTestAtCursor(fileName, currentLine, fileContent);
  if (!testName) {
    await mockDenops.cmd('echohl WarningMsg | echo "⚠️  No test found at cursor position" | echohl None');
    return;
  }
  
  // パッケージマネージャーを検出
  const packageManager = await detectPackageManager(cwd);
  
  try {
    await mockDenops.cmd(`echo "Running snapshot update for: ${testName}..."`);
    
    // テスト名をエスケープ
    const escapedTestName = testName.replace(/['"]/g, '\\$&');
    
    // コマンド引数を構築
    const args = packageManager === "npm" 
      ? ["run", "test", "--", "-t", escapedTestName, "-u"]
      : ["test", "-t", escapedTestName, "-u"];
    
    // コマンド実行（モック可能）
    const result = executeCommand 
      ? await executeCommand(packageManager, args, cwd)
      : await executeActualCommand(packageManager, args, cwd);
    
    if (result.success) {
      await mockDenops.cmd(`echo "✅ Snapshot updated for: ${testName}"`);
    } else {
      await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Failed to update snapshot: ${result.message}" | echohl None`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Error: ${errorMessage}" | echohl None`);
  }
}

/**
 * スナップショットディスパッチャー（改良版）
 */
export async function snapshotDispatcher(
  cwd: string,
  mockDenops: MockDenops,
  executeCommand?: (cmd: string, args: string[], cwd: string) => Promise<ExecuteCommandResult>
): Promise<void> {
  const packageManager = await detectPackageManager(cwd);
  
  try {
    await mockDenops.cmd('echo "Running snapshot update..."');
    
    const args = ["run", "test:fix"];
    
    const result = executeCommand 
      ? await executeCommand(packageManager, args, cwd)
      : await executeActualCommand(packageManager, args, cwd);
    
    if (result.success) {
      await mockDenops.cmd('echo "✅ Snapshot tests updated successfully!"');
    } else {
      await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Failed to update snapshots: ${result.message}" | echohl None`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Error running ${packageManager} run test:fix: ${errorMessage}" | echohl None`);
  }
}

/**
 * 実際のコマンド実行
 */
async function executeActualCommand(
  cmd: string, 
  args: string[], 
  cwd: string
): Promise<ExecuteCommandResult> {
  const process = new Deno.Command(cmd, {
    args: args,
    cwd: cwd,
    stdout: "piped",
    stderr: "piped",
  });
  
  const { code, stdout, stderr } = await process.output();
  
  if (code === 0) {
    return { success: true, message: "Success", command: [cmd, ...args] };
  } else {
    const errorMsg = new TextDecoder().decode(stderr);
    return { success: false, message: errorMsg.trim(), command: [cmd, ...args] };
  }
}