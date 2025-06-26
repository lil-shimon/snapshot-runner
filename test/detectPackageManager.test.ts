import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { detectPackageManager } from "../src/utils.ts";

describe("detectPackageManager", () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
  });
  
  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });
  
  describe("ロックファイルの検出", () => {
    it("should detect npm from package-lock.json", async () => {
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, "{}");
      const result = await detectPackageManager(tempDir);
      assertEquals(result, "npm");
    });
    
    it("should detect yarn from yarn.lock", async () => {
      await Deno.writeTextFile(`${tempDir}/yarn.lock`, "");
      const result = await detectPackageManager(tempDir);
      assertEquals(result, "yarn");
    });
    
    it("should detect pnpm from pnpm-lock.yaml", async () => {
      await Deno.writeTextFile(`${tempDir}/pnpm-lock.yaml`, "");
      const result = await detectPackageManager(tempDir);
      assertEquals(result, "pnpm");
    });
    
    it("should return npm as default when no lock file exists", async () => {
      const result = await detectPackageManager(tempDir);
      assertEquals(result, "npm");
    });
    
    it("should prioritize npm over others if multiple lock files exist", async () => {
      await Deno.writeTextFile(`${tempDir}/package-lock.json`, "{}");
      await Deno.writeTextFile(`${tempDir}/yarn.lock`, "");
      const result = await detectPackageManager(tempDir);
      assertEquals(result, "npm");
    });
  });
});