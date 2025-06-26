import { assertEquals, assertRejects } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { snapshotTestDispatcher, snapshotDispatcher, type MockDenops, type FileInfo, type ExecuteCommandResult } from "../src/dispatchers.ts";

// Denopsプラグインの統合テスト
describe("snapshot-runner plugin integration", () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });
  
  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  describe("snapshotTest dispatcher", () => {
    it("should detect test at cursor and run specific test command", async () => {
      // Setup: package-lock.json for npm detection
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, "{}");
      
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {
          // Mock Denops command execution
        }
      };
      
      const fileInfo: FileInfo = {
        fileName: "example.test.js",
        currentLine: 3,
        fileContent: [
          "import { test } from '@jest/globals';",
          "",
          "test('should calculate sum', () => {",
          "  expect(add(1, 2)).toBe(3);", // cursor here (line 3)
          "});",
        ]
      };
      
      let executedCommand: string[] = [];
      const mockExecuteCommand = async (cmd: string, args: string[], cwd: string): Promise<ExecuteCommandResult> => {
        executedCommand = [cmd, ...args];
        return { success: true, message: "Success" };
      };
      
      await snapshotTestDispatcher(tempDir, fileInfo, mockDenops, mockExecuteCommand);
      
      assertEquals(executedCommand, ["npm", "run", "test", "--", "-t", "should calculate sum", "-u"]);
    });
    
    it("should show warning when cursor is not in test file", async () => {
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {
          assertEquals(command, 'echohl WarningMsg | echo "⚠️  Not a test file" | echohl None');
        }
      };
      
      const fileInfo: FileInfo = {
        fileName: "regular.js",
        currentLine: 1,
        fileContent: ["console.log('hello');"]
      };
      
      await snapshotTestDispatcher(tempDir, fileInfo, mockDenops);
    });
    
    it("should show warning when no test found at cursor", async () => {
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {
          assertEquals(command, 'echohl WarningMsg | echo "⚠️  No test found at cursor position" | echohl None');
        }
      };
      
      const fileInfo: FileInfo = {
        fileName: "example.test.js",
        currentLine: 1,
        fileContent: [
          "import { test } from '@jest/globals';",
          "// no test here"
        ]
      };
      
      await snapshotTestDispatcher(tempDir, fileInfo, mockDenops);
    });
    
    it("should use yarn when yarn.lock exists", async () => {
      // Setup: yarn.lock for yarn detection
      await Deno.writeTextFile(`${tempDir}/yarn.lock`, "");
      
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {}
      };
      
      const fileInfo: FileInfo = {
        fileName: "example.test.js",
        currentLine: 1,
        fileContent: [
          "test('yarn test', () => {});"
        ]
      };
      
      let executedCommand: string[] = [];
      const mockExecuteCommand = async (cmd: string, args: string[], cwd: string): Promise<ExecuteCommandResult> => {
        executedCommand = [cmd, ...args];
        return { success: true, message: "Success" };
      };
      
      await snapshotTestDispatcher(tempDir, fileInfo, mockDenops, mockExecuteCommand);
      
      assertEquals(executedCommand, ["yarn", "test", "-t", "yarn test", "-u"]);
    });
  });

  describe("enhanced snapshot dispatcher", () => {
    it("should detect npm and run npm test:fix", async () => {
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, "{}");
      
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {}
      };
      
      let executedCommand: string[] = [];
      const mockExecuteCommand = async (cmd: string, args: string[], cwd: string): Promise<ExecuteCommandResult> => {
        executedCommand = [cmd, ...args];
        return { success: true, message: "Success" };
      };
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      assertEquals(executedCommand, ["npm", "run", "test:fix"]);
    });
    
    it("should detect pnpm and run pnpm test:fix", async () => {
      await Deno.writeTextFile(`${tempDir}/pnpm-lock.yaml`, "");
      
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {}
      };
      
      let executedCommand: string[] = [];
      const mockExecuteCommand = async (cmd: string, args: string[], cwd: string): Promise<ExecuteCommandResult> => {
        executedCommand = [cmd, ...args];
        return { success: true, message: "Success" };
      };
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
      
      assertEquals(executedCommand, ["pnpm", "run", "test:fix"]);
    });
    
    it("should handle command execution failure", async () => {
      const mockDenops: MockDenops = {
        cmd: async (command: string) => {
          if (command.includes("❌ Failed to update snapshots")) {
            // Expected error message
          }
        }
      };
      
      const mockExecuteCommand = async (cmd: string, args: string[], cwd: string): Promise<ExecuteCommandResult> => {
        return { success: false, message: "Command failed", command: [cmd, ...args] };
      };
      
      await snapshotDispatcher(tempDir, mockDenops, mockExecuteCommand);
    });
  });
});