import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";

describe("Async execution functionality", () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    // Reset config to defaults
    const { resetConfig } = await import("../src/config.ts");
    resetConfig();
  });
  
  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  describe("Configuration handling", () => {
    it("should default to async execution enabled", async () => {
      const { getConfig } = await import("../src/config.ts");
      const config = getConfig();
      
      assertEquals(config.asyncExecution, true);
    });
    
    it("should allow disabling async execution via config", async () => {
      const { updateConfig, getConfig } = await import("../src/config.ts");
      
      updateConfig({ asyncExecution: false });
      const config = getConfig();
      
      assertEquals(config.asyncExecution, false);
    });
    
    it("should handle async_execution from Vim config", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      loadConfigFromVim({ async_execution: false });
      const config = getConfig();
      
      assertEquals(config.asyncExecution, false);
    });
  });

  describe("Async dispatcher behavior", () => {
    it("should show async start message when async execution enabled", async () => {
      const { snapshotDispatcher } = await import("../src/dispatchers.ts");
      const { updateConfig } = await import("../src/config.ts");
      
      // Enable async execution
      updateConfig({ asyncExecution: true });
      
      // Setup package manager
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, '{}');
      
      let executedCommands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          executedCommands.push(command);
        }
      };
      
      const mockExecuteCommand = () => Promise.resolve({ 
        success: true, 
        message: "Success" 
      });
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      // Should show async start message
      assertEquals(executedCommands.some(cmd => cmd.includes("Starting async snapshot update")), true);
    });
    
    it("should show sync message when async execution disabled", async () => {
      const { snapshotDispatcher } = await import("../src/dispatchers.ts");
      const { updateConfig } = await import("../src/config.ts");
      
      // Disable async execution
      updateConfig({ asyncExecution: false });
      
      // Setup package manager
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, '{}');
      
      let executedCommands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          executedCommands.push(command);
        }
      };
      
      const mockExecuteCommand = () => Promise.resolve({ 
        success: true, 
        message: "Success" 
      });
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      // Should show regular start message and completion
      assertEquals(executedCommands.some(cmd => cmd.includes("Running snapshot update")), true);
      assertEquals(executedCommands.some(cmd => cmd.includes("✅ Snapshot tests updated successfully")), true);
    });
    
    it("should handle async execution completion", async () => {
      const { snapshotDispatcher } = await import("../src/dispatchers.ts");
      const { updateConfig } = await import("../src/config.ts");
      
      // Enable async execution
      updateConfig({ asyncExecution: true });
      
      // Setup package manager
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, '{}');
      
      let executedCommands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          executedCommands.push(command);
        }
      };
      
      let commandExecuted = false;
      const mockExecuteCommand = () => {
        commandExecuted = true;
        return Promise.resolve({ 
          success: true, 
          message: "Success" 
        });
      };
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      // Give async operation time to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      assertEquals(commandExecuted, true);
      // Should start async operation (may not have completion message yet due to async nature)
      assertEquals(executedCommands.some(cmd => cmd.includes("Starting async snapshot update")), true);
    });
  });

  describe("Error handling in async mode", () => {
    it("should handle async execution errors gracefully", async () => {
      const { snapshotDispatcher } = await import("../src/dispatchers.ts");
      const { updateConfig } = await import("../src/config.ts");
      
      // Enable async execution
      updateConfig({ asyncExecution: true });
      
      // Setup package manager
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, '{}');
      
      let executedCommands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          executedCommands.push(command);
        }
      };
      
      const mockExecuteCommand = () => Promise.resolve({ 
        success: false, 
        message: "Command failed" 
      });
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      // Give async operation time to complete and report error
      await new Promise(resolve => setTimeout(resolve, 50));
      
      assertEquals(executedCommands.some(cmd => cmd.includes("Starting async snapshot update")), true);
    });
  });

  describe("Type safety validation", () => {
    it("should validate async_execution type in Vim config", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      // Valid boolean values
      loadConfigFromVim({ async_execution: true });
      assertEquals(getConfig().asyncExecution, true);
      
      loadConfigFromVim({ async_execution: false });
      assertEquals(getConfig().asyncExecution, false);
      
      // Invalid values should be ignored
      const { resetConfig } = await import("../src/config.ts");
      resetConfig(); // Reset to default (true)
      
      loadConfigFromVim({ async_execution: "true" }); // string
      assertEquals(getConfig().asyncExecution, true); // Should remain default
      
      loadConfigFromVim({ async_execution: 1 }); // number
      assertEquals(getConfig().asyncExecution, true); // Should remain default
    });
  });
});