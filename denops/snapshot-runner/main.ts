import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import { snapshotDispatcher, snapshotTestDispatcher, type FileInfo } from "../../src/dispatchers.ts";
import { readFileContent, validateFilePath, validateLineNumber } from "../../src/fileReader.ts";
import { getExecutionLogger } from "../../src/executionLog.ts";
import { loadConfigFromVim } from "../../src/config.ts";

export async function main(denops: Denops): Promise<void> {
  // 設定の読み込み
  try {
    const vimConfig = await denops.eval('get(g:, "snapshot_runner", {})');
    loadConfigFromVim(vimConfig);
  } catch (error) {
    // 設定読み込みエラーは無視（デフォルト設定を使用）
  }
  
  denops.dispatcher = {
    async snapshot(): Promise<void> {
      const cwd = await fn.getcwd(denops);
      await snapshotDispatcher(cwd, denops);
    },
    
    async snapshotTest(): Promise<void> {
      try {
        const cwd = await fn.getcwd(denops);
        const currentFile = String(await fn.expand(denops, "%:p"));
        const currentLine = Number(await fn.line(denops, "."));
        
        // 入力検証
        if (!validateFilePath(currentFile)) {
          await denops.cmd('echohl ErrorMsg | echo "❌ Invalid file path" | echohl None');
          return;
        }
        
        // 効率的なファイル読み込み
        const fileResult = await readFileContent(currentFile);
        if (!fileResult.success) {
          await denops.cmd(`echohl ErrorMsg | echo "❌ Failed to read file: ${fileResult.error}" | echohl None`);
          return;
        }
        
        // 行番号検証
        if (!validateLineNumber(currentLine, fileResult.content)) {
          await denops.cmd('echohl ErrorMsg | echo "❌ Invalid cursor position" | echohl None');
          return;
        }
        
        const fileInfo: FileInfo = {
          fileName: currentFile,
          currentLine: currentLine,
          fileContent: fileResult.content
        };
        
        await snapshotTestDispatcher(cwd, fileInfo, denops);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await denops.cmd(`echohl ErrorMsg | echo "❌ Unexpected error: ${errorMessage}" | echohl None`);
      }
    },
    
    async showLogs(): Promise<void> {
      const logger = getExecutionLogger(denops);
      await logger.showLogs();
    },
    
    async clearLogs(): Promise<void> {
      const logger = getExecutionLogger(denops);
      logger.clearLogs();
      await denops.cmd('echo "Execution logs cleared"');
    },
  };

  // コマンド登録
  await denops.cmd(`command! Snapshot call denops#notify("${denops.name}", "snapshot", [])`);
  await denops.cmd(`command! SnapshotTest call denops#notify("${denops.name}", "snapshotTest", [])`);
  await denops.cmd(`command! SnapshotAll call denops#notify("${denops.name}", "snapshot", [])`);
  await denops.cmd(`command! SnapshotLogs call denops#notify("${denops.name}", "showLogs", [])`);
  await denops.cmd(`command! SnapshotClearLogs call denops#notify("${denops.name}", "clearLogs", [])`);
}