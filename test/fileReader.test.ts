import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";

// ファイル読み込み最適化のテスト
describe("FileReader optimization", () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });
  
  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  describe("Efficient file reading", () => {
    it("should read entire file content efficiently", async () => {
      const testFile = `${tempDir}/test.js`;
      const content = `line 1\nline 2\nline 3`;
      await Deno.writeTextFile(testFile, content);
      
      const { readFileContent } = await import("../src/fileReader.ts");
      const result = await readFileContent(testFile);
      
      assertEquals(result.success, true);
      assertEquals(result.content, ["line 1", "line 2", "line 3"]);
    });
    
    it("should handle file reading errors gracefully", async () => {
      const nonExistentFile = `${tempDir}/nonexistent.js`;
      
      const { readFileContent } = await import("../src/fileReader.ts");
      const result = await readFileContent(nonExistentFile);
      
      assertEquals(result.success, false);
      assertEquals(result.content, []);
      assertEquals(typeof result.error, "string");
    });
    
    it("should cache file content to avoid repeated reads", async () => {
      const testFile = `${tempDir}/cached.js`;
      await Deno.writeTextFile(testFile, "cached content");
      
      const { readFileContent, clearFileCache } = await import("../src/fileReader.ts");
      clearFileCache(); // Clear any existing cache
      
      // First read
      const result1 = await readFileContent(testFile);
      assertEquals(result1.success, true);
      
      // Second read should use cache
      const result2 = await readFileContent(testFile);
      assertEquals(result2.success, true);
      assertEquals(result2.content, result1.content);
    });
  });

  describe("Input validation", () => {
    it("should validate file path safely", async () => {
      const { validateFilePath } = await import("../src/fileReader.ts");
      
      // Valid paths
      assertEquals(validateFilePath("/valid/path/file.js"), true);
      assertEquals(validateFilePath("file.js"), true);
      
      // Invalid paths
      assertEquals(validateFilePath(""), false);
      assertEquals(validateFilePath("../../../etc/passwd"), false);
      assertEquals(validateFilePath(null as never), false);
      assertEquals(validateFilePath(undefined as never), false);
    });
    
    it("should handle line number bounds checking", async () => {
      const { validateLineNumber } = await import("../src/fileReader.ts");
      const fileContent = ["line 1", "line 2", "line 3"];
      
      // Valid line numbers
      assertEquals(validateLineNumber(1, fileContent), true);
      assertEquals(validateLineNumber(2, fileContent), true);
      assertEquals(validateLineNumber(3, fileContent), true);
      
      // Invalid line numbers
      assertEquals(validateLineNumber(0, fileContent), false);
      assertEquals(validateLineNumber(4, fileContent), false);
      assertEquals(validateLineNumber(-1, fileContent), false);
      assertEquals(validateLineNumber(1.5, fileContent), false);
      assertEquals(validateLineNumber(NaN, fileContent), false);
    });
  });
});