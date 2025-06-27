import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import { snapshotDispatcher, snapshotTestDispatcher, type FileInfo } from "../../src/dispatchers.ts";
import { readFileContent, validateFilePath, validateLineNumber } from "../../src/fileReader.ts";

export async function main(denops: Denops): Promise<void> {
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
  };

  // コマンド登録
  await denops.cmd(`command! Snapshot call denops#notify("${denops.name}", "snapshot", [])`);
  await denops.cmd(`command! SnapshotTest call denops#notify("${denops.name}", "snapshotTest", [])`);
  await denops.cmd(`command! SnapshotAll call denops#notify("${denops.name}", "snapshot", [])`);
}