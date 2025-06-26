import { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.0/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async snapshot(): Promise<void> {
      const cwd = await fn.getcwd(denops);
      
      try {
        await denops.cmd('echo "Running npm run test:fix..."');
        
        const process = new Deno.Command("npm", {
          args: ["run", "test:fix"],
          cwd: cwd,
          stdout: "piped",
          stderr: "piped",
        });
        
        const { code, stdout, stderr } = await process.output();
        
        if (code === 0) {
          await denops.cmd('echo "✅ Snapshot tests updated successfully!"');
        } else {
          const errorMsg = new TextDecoder().decode(stderr);
          await denops.cmd(`echohl ErrorMsg | echo "❌ Failed to update snapshots: ${errorMsg.trim()}" | echohl None`);
        }
      } catch (error) {
        await denops.cmd(`echohl ErrorMsg | echo "❌ Error running npm run test:fix: ${error.message}" | echohl None`);
      }
    },
  };

  await denops.cmd(`command! Snapshot call denops#notify("${denops.name}", "snapshot", [])`);
}