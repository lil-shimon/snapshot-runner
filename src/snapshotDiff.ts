import { MockDenops } from "./dispatchers.ts";

export interface SnapshotChange {
  filePath: string;
  testName: string;
  oldSnapshot?: string;
  newSnapshot: string;
  action: 'create' | 'update' | 'delete';
}

export interface DiffPreview {
  changes: SnapshotChange[];
  totalFiles: number;
  totalTests: number;
}

export class SnapshotDiffManager {
  private tempDir: string;
  private originalSnapshots = new Map<string, string>();
  
  constructor(private mockDenops: MockDenops, private cwd: string) {
    this.tempDir = `${this.cwd}/.snapshot-runner-temp`;
  }
  
  async generateDiffPreview(testName?: string): Promise<DiffPreview> {
    try {
      // Create temporary directory for dry-run
      await this.ensureTempDir();
      
      // Store current snapshots
      await this.backupCurrentSnapshots();
      
      // Run tests in dry-run mode to generate new snapshots
      const newSnapshots = await this.runTestsForPreview(testName);
      
      // Compare old vs new
      const changes = await this.compareSnapshots(newSnapshots);
      
      return {
        changes,
        totalFiles: new Set(changes.map(c => c.filePath)).size,
        totalTests: changes.length
      };
    } finally {
      // Clean up temp directory
      await this.cleanupTempDir();
    }
  }
  
  async showDiffViewer(preview: DiffPreview): Promise<void> {
    if (preview.changes.length === 0) {
      await this.mockDenops.cmd('echo "No snapshot changes detected"');
      return;
    }
    
    // Create diff buffer
    await this.createDiffBuffer(preview);
    
    // Set up keybindings
    await this.setupDiffKeybindings();
    
    // Show summary
    await this.showDiffSummary(preview);
  }
  
  async applySelectedChanges(approvedChanges: SnapshotChange[]): Promise<void> {
    if (approvedChanges.length === 0) {
      await this.mockDenops.cmd('echo "No changes approved for application"');
      return;
    }
    
    const { detectPackageManager } = await import("./utils.ts");
    const packageManager = await detectPackageManager(this.cwd);
    
    // Create filter for specific tests
    const testFilter = approvedChanges.map(c => c.testName).join('|');
    
    // Run update command with filter
    const args = packageManager === "npm" 
      ? ["run", "test", "--", "-t", `"(${testFilter})"`, "-u"]
      : ["test", "-t", `"(${testFilter})"`, "-u"];
    
    try {
      const process = new Deno.Command(packageManager, {
        args,
        cwd: this.cwd,
        stdout: "piped",
        stderr: "piped",
      });
      
      const { code, stderr } = await process.output();
      
      if (code === 0) {
        await this.mockDenops.cmd(`echo "✅ Applied ${approvedChanges.length} snapshot changes"`);
      } else {
        const errorMsg = new TextDecoder().decode(stderr);
        await this.mockDenops.cmd(`echohl ErrorMsg | echo "❌ Failed to apply changes: ${errorMsg.trim()}" | echohl None`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.mockDenops.cmd(`echohl ErrorMsg | echo "❌ Error applying changes: ${errorMsg}" | echohl None`);
    }
  }
  
  private async createDiffBuffer(preview: DiffPreview): Promise<void> {
    // Create new buffer for diff display
    await this.mockDenops.cmd('vnew');
    await this.mockDenops.cmd('setlocal buftype=nofile');
    await this.mockDenops.cmd('setlocal bufhidden=delete');
    await this.mockDenops.cmd('setlocal noswapfile');
    await this.mockDenops.cmd('setlocal modifiable');
    await this.mockDenops.cmd('file SnapshotDiff');
    
    // Add diff content
    const content = this.generateDiffContent(preview);
    const lines = content.split('\n');
    
    for (const line of lines) {
      await this.mockDenops.cmd(`call append(line('$'), '${this.escapeVimString(line)}')`);
    }
    
    // Remove first empty line and make read-only
    await this.mockDenops.cmd('normal! ggdd');
    await this.mockDenops.cmd('setlocal nomodifiable');
    
    // Apply syntax highlighting
    await this.setupDiffSyntax();
  }
  
  private generateDiffContent(preview: DiffPreview): string {
    let content = `Snapshot Diff Preview\n`;
    content += `=====================\n\n`;
    content += `Total files: ${preview.totalFiles}\n`;
    content += `Total tests: ${preview.totalTests}\n\n`;
    content += `Instructions:\n`;
    content += `- Press 'a' to approve a change\n`;
    content += `- Press 'r' to reject a change\n`;
    content += `- Press 'A' to approve all changes\n`;
    content += `- Press 'R' to reject all changes\n`;
    content += `- Press '<Enter>' to apply approved changes\n`;
    content += `- Press 'q' to quit without applying\n\n`;
    content += `Changes:\n`;
    content += `========\n\n`;
    
    for (let i = 0; i < preview.changes.length; i++) {
      const change = preview.changes[i];
      content += `[${i + 1}] ${change.action.toUpperCase()}: ${change.testName}\n`;
      content += `    File: ${change.filePath}\n`;
      content += `    Status: [ ] (press 'a' to approve)\n\n`;
      
      if (change.action === 'update' && change.oldSnapshot) {
        content += `    --- OLD ---\n`;
        content += this.indentText(change.oldSnapshot, '    ');
        content += `\n    +++ NEW +++\n`;
        content += this.indentText(change.newSnapshot, '    ');
      } else {
        content += `    +++ NEW +++\n`;
        content += this.indentText(change.newSnapshot, '    ');
      }
      
      content += `\n${'='.repeat(80)}\n\n`;
    }
    
    return content;
  }
  
  private indentText(text: string, indent: string): string {
    return text.split('\n').map(line => indent + line).join('\n');
  }
  
  private async setupDiffSyntax(): Promise<void> {
    // Set up syntax highlighting for diff
    await this.mockDenops.cmd('syntax match SnapshotDiffHeader /^Snapshot Diff Preview$/');
    await this.mockDenops.cmd('syntax match SnapshotDiffSeparator /^=\\+$/');
    await this.mockDenops.cmd('syntax match SnapshotDiffCreate /^\\[\\d\\+\\] CREATE:/');
    await this.mockDenops.cmd('syntax match SnapshotDiffUpdate /^\\[\\d\\+\\] UPDATE:/');
    await this.mockDenops.cmd('syntax match SnapshotDiffDelete /^\\[\\d\\+\\] DELETE:/');
    await this.mockDenops.cmd('syntax match SnapshotDiffOld /^    --- OLD ---$/');
    await this.mockDenops.cmd('syntax match SnapshotDiffNew /^    \\+\\+\\+ NEW \\+\\+\\+$/');
    await this.mockDenops.cmd('syntax match SnapshotDiffApproved /Status: \\[x\\]/');
    await this.mockDenops.cmd('syntax match SnapshotDiffPending /Status: \\[ \\]/');
    
    // Apply colors
    await this.mockDenops.cmd('highlight SnapshotDiffHeader ctermfg=Yellow guifg=Yellow');
    await this.mockDenops.cmd('highlight SnapshotDiffCreate ctermfg=Green guifg=Green');
    await this.mockDenops.cmd('highlight SnapshotDiffUpdate ctermfg=Blue guifg=Blue');
    await this.mockDenops.cmd('highlight SnapshotDiffDelete ctermfg=Red guifg=Red');
    await this.mockDenops.cmd('highlight SnapshotDiffOld ctermfg=Red guifg=Red');
    await this.mockDenops.cmd('highlight SnapshotDiffNew ctermfg=Green guifg=Green');
    await this.mockDenops.cmd('highlight SnapshotDiffApproved ctermfg=Green guifg=Green');
    await this.mockDenops.cmd('highlight SnapshotDiffPending ctermfg=Gray guifg=Gray');
  }
  
  private async setupDiffKeybindings(): Promise<void> {
    // Set up buffer-local keybindings
    await this.mockDenops.cmd('nnoremap <buffer> a :call denops#notify("snapshot-runner", "approveDiffChange", [])<CR>');
    await this.mockDenops.cmd('nnoremap <buffer> r :call denops#notify("snapshot-runner", "rejectDiffChange", [])<CR>');
    await this.mockDenops.cmd('nnoremap <buffer> A :call denops#notify("snapshot-runner", "approveAllDiffChanges", [])<CR>');
    await this.mockDenops.cmd('nnoremap <buffer> R :call denops#notify("snapshot-runner", "rejectAllDiffChanges", [])<CR>');
    await this.mockDenops.cmd('nnoremap <buffer> <CR> :call denops#notify("snapshot-runner", "applyDiffChanges", [])<CR>');
    await this.mockDenops.cmd('nnoremap <buffer> q :q<CR>');
  }
  
  private async showDiffSummary(preview: DiffPreview): Promise<void> {
    const creates = preview.changes.filter(c => c.action === 'create').length;
    const updates = preview.changes.filter(c => c.action === 'update').length;
    const deletes = preview.changes.filter(c => c.action === 'delete').length;
    
    let summary = `Snapshot changes: `;
    if (creates > 0) summary += `${creates} new, `;
    if (updates > 0) summary += `${updates} updated, `;
    if (deletes > 0) summary += `${deletes} deleted, `;
    summary = summary.replace(/, $/, '');
    
    await this.mockDenops.cmd(`echo "${summary}"`);
  }
  
  private escapeVimString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "''")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
  
  // Helper methods for diff functionality
  private async ensureTempDir(): Promise<void> {
    try {
      await Deno.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }
  }
  
  private async cleanupTempDir(): Promise<void> {
    try {
      await Deno.remove(this.tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  
  private async backupCurrentSnapshots(): Promise<void> {
    // Find all snapshot files
    const snapshotFiles = await this.findSnapshotFiles();
    
    for (const file of snapshotFiles) {
      try {
        const content = await Deno.readTextFile(file);
        this.originalSnapshots.set(file, content);
      } catch {
        // File might not exist yet
        this.originalSnapshots.set(file, '');
      }
    }
  }
  
  private async runTestsForPreview(testName?: string): Promise<Map<string, string>> {
    const { detectPackageManager } = await import("./utils.ts");
    const packageManager = await detectPackageManager(this.cwd);
    const newSnapshots = new Map<string, string>();
    
    // Run tests in dry-run mode to see what would change
    const args = testName 
      ? packageManager === "npm" 
        ? ["run", "test", "--", "-t", testName, "--no-coverage", "--verbose"]
        : ["test", "-t", testName, "--no-coverage", "--verbose"]
      : packageManager === "npm"
        ? ["run", "test", "--", "--no-coverage", "--verbose"] 
        : ["test", "--no-coverage", "--verbose"];
    
    try {
      const process = new Deno.Command(packageManager, {
        args,
        cwd: this.cwd,
        stdout: "piped",
        stderr: "piped",
      });
      
      const { stdout } = await process.output();
      const output = new TextDecoder().decode(stdout);
      
      // Parse test output to extract what would be updated
      await this.parseTestOutput(output, newSnapshots);
      
    } catch (error) {
      console.error("Error running test preview:", error);
    }
    
    return newSnapshots;
  }
  
  private async parseTestOutput(output: string, newSnapshots: Map<string, string>): Promise<void> {
    // Parse Jest/Vitest output to extract snapshot information
    // This is a simplified parser - real implementation would be more robust
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for snapshot mismatch indicators
      if (line.includes('snapshot') && (line.includes('failed') || line.includes('mismatch'))) {
        // Extract test name and file information
        const testMatch = line.match(/Test: (.+)/);
        const fileMatch = line.match(/File: (.+)/);
        
        if (testMatch && fileMatch) {
          const testName = testMatch[1].trim();
          const filePath = fileMatch[1].trim();
          
          // Look ahead for the actual snapshot content
          let snapshotContent = '';
          for (let j = i + 1; j < lines.length && j < i + 20; j++) {
            if (lines[j].includes('+ Received') || lines[j].includes('- Expected')) {
              snapshotContent += lines[j] + '\n';
            } else if (lines[j].trim() === '') {
              break;
            }
          }
          
          newSnapshots.set(`${filePath}:${testName}`, snapshotContent);
        }
      }
    }
  }
  
  private async compareSnapshots(newSnapshots: Map<string, string>): Promise<SnapshotChange[]> {
    const changes: SnapshotChange[] = [];
    
    for (const [key, newContent] of newSnapshots.entries()) {
      const [filePath, testName] = key.split(':');
      const oldContent = this.originalSnapshots.get(key);
      
      if (!oldContent || oldContent.trim() === '') {
        // New snapshot
        changes.push({
          filePath,
          testName,
          newSnapshot: newContent,
          action: 'create'
        });
      } else if (oldContent !== newContent) {
        // Updated snapshot
        changes.push({
          filePath,
          testName,
          oldSnapshot: oldContent,
          newSnapshot: newContent,
          action: 'update'
        });
      }
    }
    
    return changes;
  }
  
  // Add methods needed by tests
  private async findSnapshotFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      for await (const entry of Deno.readDir(this.cwd)) {
        if (entry.isDirectory && entry.name === '__tests__') {
          const testDir = `${this.cwd}/${entry.name}`;
          for await (const testEntry of Deno.readDir(testDir)) {
            if (testEntry.name.includes('.snap')) {
              files.push(`${testDir}/${testEntry.name}`);
            }
          }
        }
        
        // Also check for inline snapshots
        if (entry.isFile && (entry.name.endsWith('.test.js') || entry.name.endsWith('.test.ts'))) {
          files.push(`${this.cwd}/${entry.name}`);
        }
      }
    } catch {
      // Directory might not exist
    }
    
    return files;
  }
}

// Global state for diff management
let currentDiffManager: SnapshotDiffManager | null = null;
let currentDiffPreview: DiffPreview | null = null;
let approvedChanges: Set<number> = new Set();

export function setCurrentDiffSession(manager: SnapshotDiffManager, preview: DiffPreview): void {
  currentDiffManager = manager;
  currentDiffPreview = preview;
  approvedChanges.clear();
}

export async function handleDiffApproval(mockDenops: MockDenops, changeIndex?: number): Promise<void> {
  if (!currentDiffPreview) return;
  
  if (changeIndex !== undefined) {
    approvedChanges.add(changeIndex);
  } else {
    // Find current line's change index
    if (mockDenops.eval) {
      const lineNum = await mockDenops.eval('line(".")') as number;
      const index = Math.floor((lineNum - 10) / 6); // Approximate based on diff format
      if (index >= 0 && index < currentDiffPreview.changes.length) {
        approvedChanges.add(index);
      }
    }
  }
  
  await updateDiffDisplay(mockDenops);
}

export async function handleDiffRejection(mockDenops: MockDenops, changeIndex?: number): Promise<void> {
  if (!currentDiffPreview) return;
  
  if (changeIndex !== undefined) {
    approvedChanges.delete(changeIndex);
  } else {
    // Find current line's change index
    if (mockDenops.eval) {
      const lineNum = await mockDenops.eval('line(".")') as number;
      const index = Math.floor((lineNum - 10) / 6); // Approximate based on diff format
      if (index >= 0 && index < currentDiffPreview.changes.length) {
        approvedChanges.delete(index);
      }
    }
  }
  
  await updateDiffDisplay(mockDenops);
}

export async function handleApproveAll(mockDenops: MockDenops): Promise<void> {
  if (!currentDiffPreview) return;
  
  for (let i = 0; i < currentDiffPreview.changes.length; i++) {
    approvedChanges.add(i);
  }
  
  await updateDiffDisplay(mockDenops);
}

export async function handleRejectAll(mockDenops: MockDenops): Promise<void> {
  approvedChanges.clear();
  await updateDiffDisplay(mockDenops);
}

export async function handleApplyChanges(mockDenops: MockDenops): Promise<void> {
  if (!currentDiffManager || !currentDiffPreview) return;
  
  const changes = Array.from(approvedChanges).map(i => currentDiffPreview!.changes[i]);
  await currentDiffManager.applySelectedChanges(changes);
  
  // Close diff buffer
  await mockDenops.cmd('q');
  
  // Clear global state
  currentDiffManager = null;
  currentDiffPreview = null;
  approvedChanges.clear();
}

async function updateDiffDisplay(mockDenops: MockDenops): Promise<void> {
  if (!currentDiffPreview) return;
  
  // Update status indicators in the buffer
  let currentLine = 1;
  if (mockDenops.eval) {
    currentLine = await mockDenops.eval('line(".")') as number;
  }
  
  await mockDenops.cmd('setlocal modifiable');
  
  // Update all status lines
  for (let i = 0; i < currentDiffPreview.changes.length; i++) {
    const lineNum = 12 + (i * 6); // Approximate line number for status
    const status = approvedChanges.has(i) ? '[x]' : '[ ]';
    await mockDenops.cmd(`call setline(${lineNum}, '    Status: ${status} (press 'a' to approve)')`);
  }
  
  await mockDenops.cmd('setlocal nomodifiable');
  await mockDenops.cmd(`normal! ${currentLine}G`);
}