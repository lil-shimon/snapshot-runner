import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ExecutionLogger, getExecutionLogger } from "../src/executionLog.ts";
import { MockDenops } from "../src/dispatchers.ts";

describe("ExecutionLogger", () => {
  function createMockDenops(): { denops: MockDenops; commands: string[] } {
    const commands: string[] = [];
    const denops: MockDenops = {
      cmd: async (command: string) => {
        commands.push(command);
      }
    };
    return { denops, commands };
  }
  
  describe("log management", () => {
    it("should add logs with timestamp", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      await logger.addLog("Test log message");
      
      // リアルタイム表示が無効な場合、コマンドは実行されない
      assertEquals(commands.length, 0);
    });
    
    it("should show logs in realtime when enabled", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      logger.enableRealtimeDisplay();
      await logger.addLog("Realtime log message");
      
      // リアルタイム表示が有効な場合、echoコマンドが実行される
      assertEquals(commands.length, 1);
      assertEquals(commands[0].includes("echom"), true);
      assertEquals(commands[0].includes("Realtime log message"), true);
    });
    
    it("should clear logs", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      await logger.addLog("Log 1");
      await logger.addLog("Log 2");
      logger.clearLogs();
      
      await logger.showLogs();
      
      // ログがクリアされているので、"No execution logs available"が表示される
      assertEquals(commands[0], 'echo "No execution logs available"');
    });
  });
  
  describe("log display", () => {
    it("should create new buffer for logs", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      await logger.addLog("Test log 1");
      await logger.addLog("Test log 2");
      await logger.showLogs();
      
      // バッファ作成コマンドを確認
      assertEquals(commands.some(cmd => cmd === 'vnew'), true);
      assertEquals(commands.some(cmd => cmd === 'setlocal buftype=nofile'), true);
      assertEquals(commands.some(cmd => cmd === 'file SnapshotRunner-ExecutionLog'), true);
    });
    
    it("should apply syntax highlighting", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      await logger.addLog("SUCCESS: Test passed");
      await logger.addLog("ERROR: Test failed");
      await logger.showLogs();
      
      // シンタックスハイライトコマンドを確認
      assertEquals(commands.some(cmd => cmd.includes('syntax match SnapshotLogTime')), true);
      assertEquals(commands.some(cmd => cmd.includes('syntax match SnapshotLogError')), true);
      assertEquals(commands.some(cmd => cmd.includes('syntax match SnapshotLogSuccess')), true);
    });
  });
  
  describe("string escaping", () => {
    it("should escape special characters", async () => {
      const { denops, commands } = createMockDenops();
      const logger = new ExecutionLogger(denops);
      
      logger.enableRealtimeDisplay();
      await logger.addLog('Test with "quotes" and \\backslash');
      
      const echoCommand = commands[0];
      assertEquals(echoCommand.includes('\\"'), true);
      assertEquals(echoCommand.includes('\\\\'), true);
    });
  });
  
  describe("global logger instance", () => {
    it("should return the same instance", () => {
      const { denops: denops1 } = createMockDenops();
      const { denops: denops2 } = createMockDenops();
      
      const logger1 = getExecutionLogger(denops1);
      const logger2 = getExecutionLogger(denops2);
      
      // 同じインスタンスが返される（最初のdenopsを使用）
      assertEquals(logger1, logger2);
    });
  });
});