// Denopsディスパッチャー関数（テスト可能な形で分離）
import { detectPackageManager, getTestAtCursor, isTestFile } from "./utils.ts";
import { wrapError, formatErrorMessage } from "./errors.ts";
import { getConfig } from "./config.ts";

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
    const wrappedError = wrapError(error, 'COMMAND_EXECUTION_ERROR');
    await mockDenops.cmd(`echohl ErrorMsg | echo "${formatErrorMessage(wrappedError)}" | echohl None`);
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
  const config = getConfig();
  const packageManager = await detectPackageManager(cwd);
  
  try {
    if (config.asyncExecution) {
      await mockDenops.cmd('echo "Starting async snapshot update..."');
      
      // 非同期実行：結果を待たずにバックグラウンドで実行
      executeAsyncCommand(packageManager, ["run", "test:fix"], cwd, mockDenops, executeCommand);
    } else {
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
    }
  } catch (error) {
    const wrappedError = wrapError(error, 'COMMAND_EXECUTION_ERROR');
    await mockDenops.cmd(`echohl ErrorMsg | echo "Error running ${packageManager} run test:fix: ${formatErrorMessage(wrappedError)}" | echohl None`);
  }
}

/**
 * 実際のコマンド実行
 */
/**
 * 非同期コマンド実行
 */
async function executeAsyncCommand(
  cmd: string,
  args: string[],
  cwd: string,
  mockDenops: MockDenops,
  executeCommand?: (cmd: string, args: string[], cwd: string) => Promise<ExecuteCommandResult>
): Promise<void> {
  try {
    const result = executeCommand 
      ? await executeCommand(cmd, args, cwd)
      : await executeActualCommand(cmd, args, cwd);
    
    if (result.success) {
      await mockDenops.cmd('echo "✅ Async snapshot update completed successfully!"');
    } else {
      await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Async snapshot update failed: ${result.message}" | echohl None`);
    }
  } catch (error) {
    const wrappedError = wrapError(error, 'COMMAND_EXECUTION_ERROR');
    await mockDenops.cmd(`echohl ErrorMsg | echo "Async execution error: ${formatErrorMessage(wrappedError)}" | echohl None`);
  }
}

async function executeActualCommand(
  cmd: string, 
  args: string[], 
  cwd: string
): Promise<ExecuteCommandResult> {
  try {
    const process = new Deno.Command(cmd, {
      args: args,
      cwd: cwd,
      stdout: "piped",
      stderr: "piped",
    });
    
    const { code, stdout: _stdout, stderr } = await process.output();
    
    if (code === 0) {
      return { success: true, message: "Success", command: [cmd, ...args] };
    } else {
      const errorMsg = new TextDecoder().decode(stderr);
      return { success: false, message: errorMsg.trim(), command: [cmd, ...args] };
    }
  } catch (error) {
    const wrappedError = wrapError(error, 'COMMAND_EXECUTION_ERROR');
    return { 
      success: false, 
      message: wrappedError.toDetailedMessage(), 
      command: [cmd, ...args] 
    };
  }
}