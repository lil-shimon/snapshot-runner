import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { getTestAtCursor, isTestFile } from "../src/utils.ts";
describe("getTestAtCursor", () => {
  describe("テストファイルの判定", () => {
    it("should return null for non-test files", () => {
      const testCases = [
        "src/index.js",
        "lib/utils.ts",
        "components/Button.tsx",
        "README.md",
      ];
      
      for (const fileName of testCases) {
        const result = getTestAtCursor(fileName, 1, []);
        assertEquals(result, null);
      }
    });
    
    it("should recognize test files", () => {
      const testCases = [
        "src/index.test.js",
        "lib/utils.spec.ts",
        "components/Button.test.tsx",
        "__tests__/helper.spec.js",
      ];
      
      for (const fileName of testCases) {
        const isTest = isTestFile(fileName);
        assertEquals(isTest, true);
      }
    });
  });
  
  describe("テスト名の検出", () => {
    it("should detect test name from it() block", () => {
      const fileContent = [
        "import { test } from '@jest/globals';",
        "",
        "it('should add two numbers', () => {",
        "  expect(add(1, 2)).toBe(3);", // カーソルがここにある場合
        "});",
      ];
      
      const result = getTestAtCursor("example.test.js", 4, fileContent);
      assertEquals(result, "should add two numbers");
    });
    
    it("should detect test name from test() block", () => {
      const fileContent = [
        "test('validates email format', () => {",
        "  const result = validateEmail('test@example.com');", // カーソル
        "  expect(result).toBe(true);",
        "});",
      ];
      
      const result = getTestAtCursor("example.test.js", 2, fileContent);
      assertEquals(result, "validates email format");
    });
    
    it("should detect nested test in describe block", () => {
      const fileContent = [
        "describe('UserService', () => {",
        "  describe('authentication', () => {",
        "    it('should login with valid credentials', () => {",
        "      // test implementation", // カーソル
        "    });",
        "  });",
        "});",
      ];
      
      const result = getTestAtCursor("example.test.js", 4, fileContent);
      assertEquals(result, "should login with valid credentials");
    });
  });
});