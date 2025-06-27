import { assertEquals } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";

describe("Plugin configuration", () => {
  beforeEach(async () => {
    const { resetConfig } = await import("../src/config.ts");
    resetConfig();
  });

  describe("Default configuration", () => {
    it("should have sensible defaults", async () => {
      const { getConfig } = await import("../src/config.ts");
      const config = getConfig();
      
      assertEquals(config.testCommand, 'test:fix');
      assertEquals(config.testRunner, 'auto');
      assertEquals(config.showNotifications, true);
      assertEquals(config.autoSaveBeforeRun, false);
      assertEquals(config.timeout, 30000);
      assertEquals(Array.isArray(config.customTestPatterns), true);
    });
  });

  describe("Configuration updates", () => {
    it("should update specific config values", async () => {
      const { updateConfig, getConfig } = await import("../src/config.ts");
      
      updateConfig({ testCommand: 'custom:snapshot' });
      const config = getConfig();
      
      assertEquals(config.testCommand, 'custom:snapshot');
      assertEquals(config.testRunner, 'auto'); // unchanged
    });
    
    it("should merge configurations properly", async () => {
      const { updateConfig, getConfig } = await import("../src/config.ts");
      
      updateConfig({ 
        testRunner: 'jest',
        showNotifications: false
      });
      const config = getConfig();
      
      assertEquals(config.testRunner, 'jest');
      assertEquals(config.showNotifications, false);
      assertEquals(config.testCommand, 'test:fix'); // unchanged
    });
  });

  describe("Vim configuration loading", () => {
    it("should load valid vim configuration", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      const vimConfig = {
        test_command: 'update-snapshots',
        test_runner: 'jest',
        show_notifications: false,
        timeout: 60000
      };
      
      loadConfigFromVim(vimConfig);
      const config = getConfig();
      
      assertEquals(config.testCommand, 'update-snapshots');
      assertEquals(config.testRunner, 'jest');
      assertEquals(config.showNotifications, false);
      assertEquals(config.timeout, 60000);
    });
    
    it("should ignore invalid vim configuration", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      const vimConfig = {
        test_command: 123, // invalid type
        test_runner: 'invalid', // invalid value
        timeout: -1000 // invalid value
      };
      
      loadConfigFromVim(vimConfig);
      const config = getConfig();
      
      // Should keep defaults
      assertEquals(config.testCommand, 'test:fix');
      assertEquals(config.testRunner, 'auto');
      assertEquals(config.timeout, 30000);
    });
    
    it("should handle null and undefined vim config", async () => {
      const { loadConfigFromVim, getConfig } = await import("../src/config.ts");
      
      loadConfigFromVim(null);
      loadConfigFromVim(undefined);
      
      const config = getConfig();
      assertEquals(config.testCommand, 'test:fix'); // Should keep defaults
    });
  });
});