import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { ProgressTracker, executeCommandWithProgress } from "../src/progress.ts";
import { MockDenops } from "../src/dispatchers.ts";

describe("ProgressTracker", () => {
  // モックDenopsオブジェクトを作成
  function createMockDenops(): { denops: MockDenops; commands: string[] } {
    const commands: string[] = [];
    const denops: MockDenops = {
      cmd: async (command: string) => {
        commands.push(command);
      }
    };
    return { denops, commands };
  }
  
  describe("spinner display", () => {
    it("should show spinner when enabled", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops, { showSpinner: true, updateInterval: 50 });
      
      await tracker.start("Testing...");
      await new Promise(resolve => setTimeout(resolve, 60)); // スピナーを1フレーム進める
      await tracker.stop();
      
      // スピナーが表示されているか確認
      assertEquals(commands.length >= 2, true);
      assertEquals(commands[0].includes("⣾"), true);
    });
    
    it("should not show spinner when disabled", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops, { showSpinner: false });
      
      await tracker.start("Testing...");
      await tracker.stop();
      
      // スピナーが含まれていないことを確認
      assertEquals(commands[0].includes("⣾"), false);
    });
  });
  
  describe("elapsed time display", () => {
    it("should show elapsed time when enabled", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops, { showElapsedTime: true });
      
      await tracker.start("Testing...");
      await new Promise(resolve => setTimeout(resolve, 100));
      await tracker.stop();
      
      // 経過時間が表示されているか確認
      assertEquals(commands[0].includes("(0s)"), true);
    });
    
    it("should not show elapsed time when disabled", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops, { showElapsedTime: false });
      
      await tracker.start("Testing...");
      await tracker.stop();
      
      // 経過時間が含まれていないことを確認
      assertEquals(commands[0].includes("s)"), false);
    });
  });
  
  describe("percentage display", () => {
    it("should show percentage when provided", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops, { showPercentage: true });
      
      await tracker.start("Testing...");
      await tracker.updateDisplay("Testing...", 50);
      await tracker.stop();
      
      // パーセンテージが表示されているか確認
      const updateCommand = commands.find(cmd => cmd.includes("[50%]"));
      assertEquals(updateCommand !== undefined, true);
    });
  });
  
  describe("abort functionality", () => {
    it("should provide abort signal", async () => {
      const { denops } = createMockDenops();
      const tracker = new ProgressTracker(denops);
      
      await tracker.start("Testing...");
      const signal = tracker.getAbortSignal();
      
      assertExists(signal);
      assertEquals(signal?.aborted, false);
      
      await tracker.abort();
      assertEquals(signal?.aborted, true);
    });
  });
  
  describe("success and error messages", () => {
    it("should display success message with elapsed time", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops);
      
      await tracker.start("Testing...");
      await new Promise(resolve => setTimeout(resolve, 100));
      await tracker.stop("Test completed successfully!");
      
      const lastCommand = commands[commands.length - 1];
      assertEquals(lastCommand.includes("✅"), true);
      assertEquals(lastCommand.includes("Test completed successfully!"), true);
      assertEquals(lastCommand.includes("(0s)"), true);
    });
    
    it("should display error message with elapsed time", async () => {
      const { denops, commands } = createMockDenops();
      const tracker = new ProgressTracker(denops);
      
      await tracker.start("Testing...");
      await tracker.stop(undefined, "Test failed!");
      
      const lastCommand = commands[commands.length - 1];
      assertEquals(lastCommand.includes("❌"), true);
      assertEquals(lastCommand.includes("Test failed!"), true);
    });
  });
});

describe("executeCommandWithProgress", () => {
  function createMockDenops(): MockDenops {
    return {
      cmd: async (_command: string) => {}
    };
  }
  
  it("should detect test progress from output", async () => {
    const denops = createMockDenops();
    const progressTracker = new ProgressTracker(denops);
    
    await progressTracker.start("Testing...");
    
    // echo コマンドを使ってテスト出力をシミュレート
    const result = await executeCommandWithProgress({
      command: "echo",
      args: ["Running 5/10 tests"],
      cwd: Deno.cwd(),
      progressTracker
    });
    
    await progressTracker.stop();
    
    assertEquals(result.success, true);
  });
  
  it("should handle cancellation", async () => {
    const denops = createMockDenops();
    const progressTracker = new ProgressTracker(denops);
    
    await progressTracker.start("Testing...");
    
    // 即座にキャンセル
    const abortPromise = new Promise<void>(resolve => {
      setTimeout(async () => {
        await progressTracker.abort();
        resolve();
      }, 10);
    });
    
    const result = await executeCommandWithProgress({
      command: "sleep",
      args: ["1"],
      cwd: Deno.cwd(),
      progressTracker
    });
    
    await abortPromise;
    
    assertEquals(result.cancelled, true);
    assertEquals(result.success, false);
    assertEquals(result.message, "Operation cancelled by user");
  });
  
  it("should capture progress updates", async () => {
    const denops = createMockDenops();
    const progressTracker = new ProgressTracker(denops);
    const progressUpdates: string[] = [];
    
    await progressTracker.start("Testing...");
    
    const result = await executeCommandWithProgress({
      command: "echo",
      args: ["test output"],
      cwd: Deno.cwd(),
      progressTracker,
      onProgress: (output) => {
        progressUpdates.push(output);
      }
    });
    
    await progressTracker.stop();
    
    assertEquals(result.success, true);
    assertEquals(progressUpdates.length > 0, true);
    assertEquals(progressUpdates.some(update => update.includes("test output")), true);
  });
});