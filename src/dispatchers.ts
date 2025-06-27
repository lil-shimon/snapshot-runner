// Denopsディスパッチャー関数（テスト可能な形で分離）
import { detectPackageManager, getTestAtCursor, isTestFile } from "./utils.ts";
import { wrapError, formatErrorMessage } from "./errors.ts";
import { getConfig } from "./config.ts";
import { ProgressTracker, executeCommandWithProgress } from "./progress.ts";
import { getExecutionLogger } from "./executionLog.ts";

export interface MockDenops {
  cmd(command: string): Promise<void>;
  eval?(expr: string): Promise<unknown>;
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
  cancelled?: boolean;
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
    const args = ["run", "test:fix"];
    
    if (config.showProgress) {
      // プログレストラッキングを使用
      const progressTracker = new ProgressTracker(mockDenops, {
        showSpinner: config.showSpinner,
        showElapsedTime: config.showElapsedTime,
        showPercentage: config.showPercentage,
        updateInterval: config.progressUpdateInterval
      });
      
      if (config.asyncExecution) {
        await progressTracker.start("Starting async snapshot update...");
        
        // 非同期実行
        executeAsyncCommandWithProgress(packageManager, args, cwd, mockDenops, progressTracker, executeCommand);
      } else {
        await progressTracker.start("Running snapshot update...");
        
        const result = executeCommand
          ? await executeCommand(packageManager, args, cwd)
          : await executeCommandWithProgress({
              command: packageManager,
              args,
              cwd,
              progressTracker,
              onProgress: config.showExecutionLog ? async (output) => {
                const logger = getExecutionLogger(mockDenops);
                await logger.addLog(output.trim());
              } : undefined
            });
        
        if (result.cancelled) {
          await progressTracker.stop(undefined, "Snapshot update cancelled");
        } else if (result.success) {
          await progressTracker.stop("Snapshot tests updated successfully!");
        } else {
          await progressTracker.stop(undefined, `Failed to update snapshots: ${result.message}`);
        }
      }
    } else {
      // 従来の方法（プログレス表示なし）
      if (config.asyncExecution) {
        await mockDenops.cmd('echo "Starting async snapshot update..."');
        executeAsyncCommand(packageManager, args, cwd, mockDenops, executeCommand);
      } else {
        await mockDenops.cmd('echo "Running snapshot update..."');
        
        const result = executeCommand 
          ? await executeCommand(packageManager, args, cwd)
          : await executeActualCommand(packageManager, args, cwd);
        
        if (result.success) {
          await mockDenops.cmd('echo "✅ Snapshot tests updated successfully!"');
        } else {
          await mockDenops.cmd(`echohl ErrorMsg | echo "❌ Failed to update snapshots: ${result.message}" | echohl None`);
        }
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

/**
 * プログレス表示付き非同期コマンド実行
 */
async function executeAsyncCommandWithProgress(
  cmd: string,
  args: string[],
  cwd: string,
  mockDenops: MockDenops,
  progressTracker: ProgressTracker,
  executeCommand?: (cmd: string, args: string[], cwd: string) => Promise<ExecuteCommandResult>
): Promise<void> {
  try {
    const config = getConfig();
    
    const result = executeCommand
      ? await executeCommand(cmd, args, cwd)
      : await executeCommandWithProgress({
          command: cmd,
          args,
          cwd,
          progressTracker,
          onProgress: config.showExecutionLog ? async (output) => {
            const logger = getExecutionLogger(mockDenops);
            await logger.addLog(output.trim());
          } : undefined
        });
    
    if (result.cancelled) {
      await progressTracker.stop(undefined, "Async snapshot update cancelled");
    } else if (result.success) {
      await progressTracker.stop("Async snapshot update completed successfully!");
    } else {
      await progressTracker.stop(undefined, `Async snapshot update failed: ${result.message}`);
    }
  } catch (error) {
    const wrappedError = wrapError(error, 'COMMAND_EXECUTION_ERROR');
    await progressTracker.stop(undefined, `Async execution error: ${formatErrorMessage(wrappedError)}`);
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