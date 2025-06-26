import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";
import { snapshotDispatcher, snapshotTestDispatcher, type FileInfo } from "../../src/dispatchers.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async snapshot(): Promise<void> {
      const cwd = await fn.getcwd(denops);
      await snapshotDispatcher(cwd, denops);
    },
    
    async snapshotTest(): Promise<void> {
      const cwd = await fn.getcwd(denops);
      const currentFile = await fn.expand(denops, "%:p");
      const currentLine = await fn.line(denops, ".");
      
      // ファイル内容を取得
      const totalLines = await fn.line(denops, "$");
      const fileContent: string[] = [];
      
      for (let i = 1; i <= totalLines; i++) {
        const line = await fn.getline(denops, i);
        fileContent.push(line);
      }
      
      const fileInfo: FileInfo = {
        fileName: String(currentFile),
        currentLine: Number(currentLine),
        fileContent: fileContent
      };
      
      await snapshotTestDispatcher(cwd, fileInfo, denops);
    },
  };

  // コマンド登録
  await denops.cmd(`command! Snapshot call denops#notify("${denops.name}", "snapshot", [])`);
  await denops.cmd(`command! SnapshotTest call denops#notify("${denops.name}", "snapshotTest", [])`);
  await denops.cmd(`command! SnapshotAll call denops#notify("${denops.name}", "snapshot", [])`);
}