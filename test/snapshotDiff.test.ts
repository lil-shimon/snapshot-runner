import { assertEquals, assertExists } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { SnapshotDiffManager, SnapshotChange, DiffPreview } from "../src/snapshotDiff.ts";
import { MockDenops } from "../src/dispatchers.ts";

describe("SnapshotDiffManager", () => {
  let tempDir: string;
  let mockDenops: MockDenops;
  let commands: string[];
  
  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await Deno.makeTempDir();
    
    commands = [];
    mockDenops = {
      cmd: async (command: string) => {
        commands.push(command);
      },
      eval: async (expr: string) => {
        if (expr === 'line(".")') return 1;
        return null;
      }
    } as MockDenops;
  });
  
  afterEach(async () => {
    // Clean up temp directory
    try {
      await Deno.remove(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("generateDiffPreview", () => {
    it("should return empty changes when no snapshots need updating", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      
      const preview = await diffManager.generateDiffPreview();
      
      assertEquals(preview.changes.length, 0);
      assertEquals(preview.totalFiles, 0);
      assertEquals(preview.totalTests, 0);
    });
    
    it("should detect new snapshot files", async () => {
      // Create a test file that would generate a snapshot
      await Deno.writeTextFile(`${tempDir}/example.test.js`, `
        test('should create snapshot', () => {
          expect(component).toMatchSnapshot();
        });
      `);
      
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      
      // Mock the test output parsing
      const mockChanges: SnapshotChange[] = [
        {
          filePath: `${tempDir}/example.test.js`,
          testName: "should create snapshot",
          newSnapshot: "Component output",
          action: "create"
        }
      ];
      
      // Override the private method for testing
      (diffManager as any).parseTestOutput = async () => {
        const newSnapshots = new Map();
        newSnapshots.set(`${tempDir}/example.test.js:should create snapshot`, "Component output");
        return newSnapshots;
      };
      
      const preview = await diffManager.generateDiffPreview();
      
      assertEquals(preview.changes.length, 1);
      assertEquals(preview.changes[0].action, "create");
      assertEquals(preview.changes[0].testName, "should create snapshot");
    });
    
    it("should detect updated snapshot files", async () => {
      // Create existing snapshot content
      const snapshotFile = `${tempDir}/__tests__/example.test.js.snap`;
      await Deno.mkdir(`${tempDir}/__tests__`, { recursive: true });
      await Deno.writeTextFile(snapshotFile, 'exports[`should update snapshot 1`] = `"old content"`;');
      
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      
      // Mock finding snapshot files and parsing output
      (diffManager as any).findSnapshotFiles = async () => [snapshotFile];
      (diffManager as any).parseTestOutput = async () => {
        const newSnapshots = new Map();
        newSnapshots.set(`${snapshotFile}:should update snapshot`, "new content");
        return newSnapshots;
      };
      
      const preview = await diffManager.generateDiffPreview();
      
      assertEquals(preview.changes.length, 1);
      assertEquals(preview.changes[0].action, "update");
      assertEquals(preview.changes[0].oldSnapshot, 'exports[`should update snapshot 1`] = `"old content"`;');
      assertEquals(preview.changes[0].newSnapshot, "new content");
    });
    
    it("should filter by test name when provided", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      
      // Mock the test execution to verify test name filtering
      let executedCommand = "";
      (diffManager as any).runTestsForPreview = async (testName?: string) => {
        if (testName) {
          executedCommand = `filtered: ${testName}`;
        } else {
          executedCommand = "all tests";
        }
        return new Map();
      };
      
      await diffManager.generateDiffPreview("specific test");
      
      assertEquals(executedCommand, "filtered: specific test");
    });
  });

  describe("showDiffViewer", () => {
    it("should show message when no changes detected", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const emptyPreview: DiffPreview = {
        changes: [],
        totalFiles: 0,
        totalTests: 0
      };
      
      await diffManager.showDiffViewer(emptyPreview);
      
      assertEquals(commands.some(cmd => cmd.includes("No snapshot changes detected")), true);
    });
    
    it("should create diff buffer with proper settings", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const preview: DiffPreview = {
        changes: [
          {
            filePath: "/test.js",
            testName: "test 1",
            newSnapshot: "new content",
            action: "create"
          }
        ],
        totalFiles: 1,
        totalTests: 1
      };
      
      await diffManager.showDiffViewer(preview);
      
      // Verify buffer creation commands
      assertEquals(commands.some(cmd => cmd === "vnew"), true);
      assertEquals(commands.some(cmd => cmd === "setlocal buftype=nofile"), true);
      assertEquals(commands.some(cmd => cmd === "setlocal bufhidden=delete"), true);
      assertEquals(commands.some(cmd => cmd === "file SnapshotDiff"), true);
    });
    
    it("should set up diff syntax highlighting", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const preview: DiffPreview = {
        changes: [
          {
            filePath: "/test.js",
            testName: "test 1",
            newSnapshot: "content",
            action: "update",
            oldSnapshot: "old content"
          }
        ],
        totalFiles: 1,
        totalTests: 1
      };
      
      await diffManager.showDiffViewer(preview);
      
      // Verify syntax highlighting setup
      assertEquals(commands.some(cmd => cmd.includes("syntax match SnapshotDiffHeader")), true);
      assertEquals(commands.some(cmd => cmd.includes("syntax match SnapshotDiffCreate")), true);
      assertEquals(commands.some(cmd => cmd.includes("syntax match SnapshotDiffUpdate")), true);
      assertEquals(commands.some(cmd => cmd.includes("highlight SnapshotDiffHeader")), true);
    });
    
    it("should set up keyboard bindings", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const preview: DiffPreview = {
        changes: [
          {
            filePath: "/test.js",
            testName: "test 1",
            newSnapshot: "content",
            action: "create"
          }
        ],
        totalFiles: 1,
        totalTests: 1
      };
      
      await diffManager.showDiffViewer(preview);
      
      // Verify keybinding setup
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> a")), true);
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> r")), true);
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> A")), true);
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> R")), true);
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> <CR>")), true);
      assertEquals(commands.some(cmd => cmd.includes("nnoremap <buffer> q")), true);
    });
  });

  describe("applySelectedChanges", () => {
    it("should show message when no changes approved", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      
      await diffManager.applySelectedChanges([]);
      
      assertEquals(commands.some(cmd => cmd.includes("No changes approved for application")), true);
    });
    
    it("should execute test command with correct test filter", async () => {
      // Create package.json for npm detection
      await Deno.writeTextFile(`${tempDir}/package.json`, '{"scripts": {"test": "jest"}}');
      
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const changes: SnapshotChange[] = [
        {
          filePath: "/test1.js",
          testName: "test one",
          newSnapshot: "content1",
          action: "update"
        },
        {
          filePath: "/test2.js", 
          testName: "test two",
          newSnapshot: "content2",
          action: "create"
        }
      ];
      
      // Mock successful command execution
      let executedCommand = "";
      let executedArgs: string[] = [];
      (globalThis as any).mockCommand = {
        output: async () => ({ code: 0, stderr: new Uint8Array() })
      };
      
      const originalCommand = Deno.Command;
      (Deno as any).Command = function(cmd: string, options: any) {
        executedCommand = cmd;
        executedArgs = options.args;
        return (globalThis as any).mockCommand;
      };
      
      try {
        await diffManager.applySelectedChanges(changes);
        
        assertEquals(executedCommand, "npm");
        assertEquals(executedArgs.includes("-t"), true);
        assertEquals(executedArgs.some(arg => arg.includes("test one") && arg.includes("test two")), true);
        assertEquals(executedArgs.includes("-u"), true);
        assertEquals(commands.some(cmd => cmd.includes("Applied 2 snapshot changes")), true);
      } finally {
        (Deno as any).Command = originalCommand;
      }
    });
    
    it("should handle command execution failure", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const changes: SnapshotChange[] = [
        {
          filePath: "/test.js",
          testName: "failing test",
          newSnapshot: "content",
          action: "update"
        }
      ];
      
      // Mock failed command execution
      (globalThis as any).mockCommand = {
        output: async () => ({ 
          code: 1, 
          stderr: new TextEncoder().encode("Test execution failed")
        })
      };
      
      const originalCommand = Deno.Command;
      (Deno as any).Command = function() {
        return (globalThis as any).mockCommand;
      };
      
      try {
        await diffManager.applySelectedChanges(changes);
        
        assertEquals(commands.some(cmd => cmd.includes("Failed to apply changes")), true);
        assertEquals(commands.some(cmd => cmd.includes("Test execution failed")), true);
      } finally {
        (Deno as any).Command = originalCommand;
      }
    });
  });

  describe("diff content generation", () => {
    it("should generate proper diff content format", async () => {
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const preview: DiffPreview = {
        changes: [
          {
            filePath: "/test.js",
            testName: "should create snapshot",
            newSnapshot: "new content",
            action: "create"
          },
          {
            filePath: "/test2.js",
            testName: "should update snapshot", 
            oldSnapshot: "old content",
            newSnapshot: "updated content",
            action: "update"
          }
        ],
        totalFiles: 2,
        totalTests: 2
      };
      
      // Call private method for testing
      const content = (diffManager as any).generateDiffContent(preview);
      
      assertEquals(content.includes("Snapshot Diff Preview"), true);
      assertEquals(content.includes("Total files: 2"), true);
      assertEquals(content.includes("Total tests: 2"), true);
      assertEquals(content.includes("[1] CREATE: should create snapshot"), true);
      assertEquals(content.includes("[2] UPDATE: should update snapshot"), true);
      assertEquals(content.includes("--- OLD ---"), true);
      assertEquals(content.includes("+++ NEW +++"), true);
      assertEquals(content.includes("Instructions:"), true);
      assertEquals(content.includes("Press 'a' to approve"), true);
    });
  });

  describe("snapshot file detection", () => {
    it("should find snapshot files in __tests__ directory", async () => {
      const testDir = `${tempDir}/__tests__`;
      await Deno.mkdir(testDir, { recursive: true });
      await Deno.writeTextFile(`${testDir}/example.test.js.snap`, "snapshot content");
      
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const files = await (diffManager as any).findSnapshotFiles();
      
      assertEquals(files.length, 1);
      assertEquals(files[0].endsWith("example.test.js.snap"), true);
    });
    
    it("should find inline snapshot files", async () => {
      await Deno.writeTextFile(`${tempDir}/example.test.js`, "test content");
      await Deno.writeTextFile(`${tempDir}/another.test.ts`, "test content");
      
      const diffManager = new SnapshotDiffManager(mockDenops, tempDir);
      const files = await (diffManager as any).findSnapshotFiles();
      
      assertEquals(files.length, 2);
      assertEquals(files.some((f: string) => f.endsWith("example.test.js")), true);
      assertEquals(files.some((f: string) => f.endsWith("another.test.ts")), true);
    });
    
    it("should handle directories that don't exist", async () => {
      const nonExistentDir = `${tempDir}/nonexistent`;
      const diffManager = new SnapshotDiffManager(mockDenops, nonExistentDir);
      
      const files = await (diffManager as any).findSnapshotFiles();
      
      assertEquals(files.length, 0);
    });
  });
});