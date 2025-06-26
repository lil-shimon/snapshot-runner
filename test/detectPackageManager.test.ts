import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";

describe("detectPackageManager", () => {
  describe("ロックファイルの検出", () => {
    it("should detect npm from package-lock.json", async () => {
      // TODO: package-lock.jsonが存在する場合にnpmを返すことを確認
    });
    
    it("should detect yarn from yarn.lock", async () => {
      // TODO: yarn.lockが存在する場合にyarnを返すことを確認
    });
    
    it("should detect pnpm from pnpm-lock.yaml", async () => {
      // TODO: pnpm-lock.yamlが存在する場合にpnpmを返すことを確認
    });
    
    it("should return npm as default when no lock file exists", async () => {
      // TODO: ロックファイルが存在しない場合にnpmを返すことを確認
    });
    
    it("should prioritize npm over others if multiple lock files exist", async () => {
      // TODO: 複数のロックファイルが存在する場合の優先順位を確認
    });
  });
});