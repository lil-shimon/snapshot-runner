import { assertEquals } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";

describe("Config validation improvements", () => {
  beforeEach(async () => {
    const { resetConfig } = await import("../src/config.ts");
    resetConfig();
  });

  describe("Type guard functions", () => {
    it("should reject invalid test runners", async () => {
      const invalidConfigs = [
        { test_runner: "invalid_runner" },
        { test_runner: 123 },
        { test_runner: null },
        { test_runner: [] },
        { test_runner: {} }
      ];
      
      for (const invalidConfig of invalidConfigs) {
        const { resetConfig, loadConfigFromVim, getConfig } = await import("../src/config.ts");
        resetConfig();
        loadConfigFromVim(invalidConfig);
        const config = getConfig();
        assertEquals(config.testRunner, 'auto'); // Should remain default
      }
    });
    
    it("should validate timeout bounds", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      // Valid timeout
      loadConfigFromVim({ timeout: 60000 });
      assertEquals(getConfig().timeout, 60000);
      
      // Invalid timeouts
      const invalidTimeouts = [
        { timeout: -1000 }, // negative
        { timeout: 0 }, // zero
        { timeout: 400000 }, // too large (over 5 minutes)
        { timeout: Infinity }, // infinity
        { timeout: NaN }, // NaN
        { timeout: "60000" }, // string
        { timeout: null }, // null
      ];
      
      for (const invalidTimeout of invalidTimeouts) {
        const { resetConfig, loadConfigFromVim, getConfig } = await import("../src/config.ts");
        resetConfig();
        loadConfigFromVim(invalidTimeout);
        const config = getConfig();
        assertEquals(config.timeout, 30000); // Should remain default
      }
    });
    
    it("should validate custom test patterns array", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      // Valid patterns
      loadConfigFromVim({ 
        custom_test_patterns: ["**/*.test.js", "**/*.spec.ts"] 
      });
      const config = getConfig();
      assertEquals(config.customTestPatterns?.includes("**/*.test.js"), true);
      
      // Invalid patterns
      const invalidPatterns = [
        { custom_test_patterns: "not_an_array" },
        { custom_test_patterns: [123, "valid"] }, // mixed types
        { custom_test_patterns: [null, undefined] }, // null values
        { custom_test_patterns: { "0": "pattern" } }, // object instead of array
      ];
      
      for (const invalidPattern of invalidPatterns) {
        const { resetConfig, loadConfigFromVim, getConfig } = await import("../src/config.ts");
        resetConfig();
        loadConfigFromVim(invalidPattern);
        const config = getConfig();
        // Should remain default patterns
        assertEquals(Array.isArray(config.customTestPatterns), true);
        assertEquals(config.customTestPatterns.includes("**/*.test.js"), true);
      }
    });
    
    it("should handle edge cases gracefully", async () => {
      const edgeCases = [
        null,
        undefined,
        "string_instead_of_object",
        123,
        [],
        true,
        Symbol("test"),
      ];
      
      for (const edgeCase of edgeCases) {
        const { resetConfig, loadConfigFromVim, getConfig } = await import("../src/config.ts");
        resetConfig();
        loadConfigFromVim(edgeCase);
        const config = getConfig();
        // Should remain defaults for all values
        assertEquals(config.testCommand, 'test:fix');
        assertEquals(config.testRunner, 'auto');
        assertEquals(config.showNotifications, true);
      }
    });
  });
  
  describe("Partial config updates", () => {
    it("should only update valid fields", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      loadConfigFromVim({
        test_command: "valid:command",
        test_runner: "invalid_runner", // this should be ignored
        show_notifications: false,
        timeout: -100, // this should be ignored
      });
      
      const config = getConfig();
      assertEquals(config.testCommand, "valid:command"); // updated
      assertEquals(config.testRunner, 'auto'); // remains default
      assertEquals(config.showNotifications, false); // updated  
      assertEquals(config.timeout, 30000); // remains default
    });
  });
});