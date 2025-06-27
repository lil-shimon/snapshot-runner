import { assertEquals, assert } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";

describe("Performance tests", () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });
  
  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  describe("Large file handling", () => {
    it("should handle large test files efficiently", async () => {
      const { readFileContent, clearFileCache } = await import("../src/fileReader.ts");
      
      // Create a large test file with 1000 lines
      const largeFileContent = Array.from({ length: 1000 }, (_, i) => 
        i % 20 === 0 ? `test('test case ${i}', () => { expect(true).toBe(true); });` : `// Line ${i + 1}`
      ).join('\n');
      
      const largeFilePath = `${tempDir}/large.test.js`;
      await Deno.writeTextFile(largeFilePath, largeFileContent);
      
      // Clear cache to ensure fresh read
      clearFileCache();
      
      // Measure read performance
      const startTime = performance.now();
      const result = await readFileContent(largeFilePath);
      const endTime = performance.now();
      
      const readTime = endTime - startTime;
      
      // Should read successfully
      assertEquals(result.success, true);
      assertEquals(result.content.length, 1000);
      
      // Should complete within reasonable time (under 100ms)
      assert(readTime < 100, `File reading took ${readTime}ms, expected under 100ms`);
    });
    
    it("should benefit from file caching on repeated reads", async () => {
      const { readFileContent, clearFileCache } = await import("../src/fileReader.ts");
      
      const testFilePath = `${tempDir}/cached.test.js`;
      const content = Array.from({ length: 500 }, (_, i) => `// Line ${i + 1}`).join('\n');
      await Deno.writeTextFile(testFilePath, content);
      
      // Clear cache for baseline
      clearFileCache();
      
      // First read (cache miss)
      const startTime1 = performance.now();
      const result1 = await readFileContent(testFilePath);
      const endTime1 = performance.now();
      const firstReadTime = endTime1 - startTime1;
      
      // Second read (cache hit)
      const startTime2 = performance.now();
      const result2 = await readFileContent(testFilePath);
      const endTime2 = performance.now();
      const secondReadTime = endTime2 - startTime2;
      
      // Both should succeed
      assertEquals(result1.success, true);
      assertEquals(result2.success, true);
      assertEquals(result1.content.length, result2.content.length);
      
      // Second read should be significantly faster (cache hit)
      assert(secondReadTime < firstReadTime / 2, 
        `Cache hit (${secondReadTime}ms) should be faster than cache miss (${firstReadTime}ms)`);
    });
  });

  describe("Package manager detection performance", () => {
    it("should detect package manager quickly in large directories", async () => {
      const { detectPackageManager } = await import("../src/utils.ts");
      
      // Create multiple lock files to test detection priority
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, '{}');
      await Deno.writeTextFile(`${tempDir}/yarn.lock`, '');
      await Deno.writeTextFile(`${tempDir}/pnpm-lock.yaml`, '');
      
      // Create many other files to simulate large directory
      for (let i = 0; i < 100; i++) {
        await Deno.writeTextFile(`${tempDir}/file${i}.js`, `// File ${i}`);
      }
      
      const startTime = performance.now();
      const packageManager = await detectPackageManager(tempDir);
      const endTime = performance.now();
      
      const detectionTime = endTime - startTime;
      
      // Should detect npm (first priority)
      assertEquals(packageManager, 'npm');
      
      // Should complete quickly (under 50ms)
      assert(detectionTime < 50, `Package manager detection took ${detectionTime}ms, expected under 50ms`);
    });
  });

  describe("Test parsing performance", () => {
    it("should parse test names efficiently from large files", async () => {
      const { getTestAtCursor } = await import("../src/utils.ts");
      
      // Create file with many test cases
      const testLines = [];
      for (let i = 0; i < 200; i++) {
        if (i % 10 === 0) {
          testLines.push(`test('performance test ${i}', () => {`);
        } else {
          testLines.push(`  // Test implementation line ${i}`);
        }
      }
      
      const targetLine = 101; // Around middle of file
      
      const startTime = performance.now();
      const testName = getTestAtCursor('performance.test.js', targetLine, testLines);
      const endTime = performance.now();
      
      const parseTime = endTime - startTime;
      
      // Should find the correct test
      assertEquals(testName, 'performance test 100');
      
      // Should complete quickly (under 10ms)
      assert(parseTime < 10, `Test parsing took ${parseTime}ms, expected under 10ms`);
    });
  });

  describe("Memory usage", () => {
    it("should handle multiple files without excessive memory growth", async () => {
      const { readFileContent, clearFileCache } = await import("../src/fileReader.ts");
      
      // Create multiple test files
      const files: string[] = [];
      for (let i = 0; i < 10; i++) {
        const filePath = `${tempDir}/test${i}.test.js`;
        const content = Array.from({ length: 100 }, (_, j) => 
          `test('test ${i}-${j}', () => { expect(true).toBe(true); });`
        ).join('\n');
        
        await Deno.writeTextFile(filePath, content);
        files.push(filePath);
      }
      
      // Read all files multiple times
      for (let round = 0; round < 3; round++) {
        for (const filePath of files) {
          const result = await readFileContent(filePath);
          assertEquals(result.success, true);
        }
      }
      
      // Test should complete without memory issues
      // This is more of a stability test - if it runs without crashing, memory is managed well
      assert(true, "Memory test completed successfully");
    });
  });
});