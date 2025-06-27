import { MockDenops } from "./dispatchers.ts";
import { getExecutionLogger } from "./executionLog.ts";

export interface ProgressOptions {
  showSpinner?: boolean;
  showElapsedTime?: boolean;
  showPercentage?: boolean;
  updateInterval?: number;
}

export class ProgressTracker {
  private startTime: number;
  private intervalId?: number;
  private currentFrame = 0;
  private isRunning = false;
  private spinnerFrames = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
  private abortController?: AbortController;
  
  constructor(
    private mockDenops: MockDenops,
    private options: ProgressOptions = {}
  ) {
    this.startTime = Date.now();
    this.options = {
      showSpinner: true,
      showElapsedTime: true,
      showPercentage: false,
      updateInterval: 100,
      ...options
    };
  }
  
  async start(message: string): Promise<void> {
    this.isRunning = true;
    this.startTime = Date.now();
    this.abortController = new AbortController();
    
    await this.updateDisplay(message);
    
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.updateDisplay(message);
      }
    }, this.options.updateInterval);
  }
  
  async updateDisplay(message: string, percentage?: number): Promise<void> {
    let displayText = "";
    
    if (this.options.showSpinner && !percentage) {
      displayText += this.spinnerFrames[this.currentFrame] + " ";
      this.currentFrame = (this.currentFrame + 1) % this.spinnerFrames.length;
    }
    
    displayText += message;
    
    if (this.options.showPercentage && percentage !== undefined) {
      displayText += ` [${percentage}%]`;
    }
    
    if (this.options.showElapsedTime) {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      displayText += ` (${elapsed}s)`;
    }
    
    await this.mockDenops.cmd(`echo "${this.escapeVimString(displayText)}"`);
  }
  
  async stop(successMessage?: string, errorMessage?: string): Promise<void> {
    this.isRunning = false;
    
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    
    if (successMessage) {
      await this.mockDenops.cmd(`echo "✅ ${this.escapeVimString(successMessage)} (${elapsed}s)"`);
    } else if (errorMessage) {
      await this.mockDenops.cmd(`echohl ErrorMsg | echo "❌ ${this.escapeVimString(errorMessage)} (${elapsed}s)" | echohl None`);
    }
  }
  
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }
  
  async abort(): Promise<void> {
    this.abortController?.abort();
    await this.stop();
  }
  
  private escapeVimString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

export interface ProcessWithProgress {
  command: string;
  args: string[];
  cwd: string;
  onProgress?: (output: string) => void;
  progressTracker: ProgressTracker;
}

export async function executeCommandWithProgress(
  options: ProcessWithProgress
): Promise<{ success: boolean; message: string; cancelled?: boolean }> {
  const { command, args, cwd, onProgress, progressTracker } = options;
  const abortSignal = progressTracker.getAbortSignal();
  
  let child: Deno.ChildProcess | null = null;
  
  try {
    const process = new Deno.Command(command, {
      args,
      cwd,
      stdout: "piped",
      stderr: "piped",
      signal: abortSignal,
    });
    
    child = process.spawn();
    
    // Stream stdout for progress updates
    const reader = child.stdout.getReader();
    const decoder = new TextDecoder();
    let outputBuffer = "";
    
    const stdoutReading = (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          outputBuffer += chunk;
          
          // Parse progress from output if available
          if (onProgress) {
            onProgress(chunk);
          }
          
          // Look for test progress patterns
          const progressMatch = chunk.match(/(\d+)\/(\d+) tests?/);
          if (progressMatch) {
            const current = parseInt(progressMatch[1]);
            const total = parseInt(progressMatch[2]);
            const percentage = Math.floor((current / total) * 100);
            await progressTracker.updateDisplay(`Running tests...`, percentage);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error reading stdout:", error);
        }
      } finally {
        reader.releaseLock();
      }
    })();
    
    const status = await child.status;
    await stdoutReading;
    
    if (abortSignal?.aborted) {
      return { 
        success: false, 
        message: "Operation cancelled by user", 
        cancelled: true 
      };
    }
    
    if (status.success) {
      return { success: true, message: "Command completed successfully" };
    } else {
      const stderrReader = child.stderr.getReader();
      let stderrBuffer = "";
      try {
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          stderrBuffer += new TextDecoder().decode(value, { stream: true });
        }
      } catch (e) {
        // Ignore error reading stderr
      } finally {
        stderrReader.releaseLock();
      }
      const errorMsg = stderrBuffer;
      return { success: false, message: errorMsg.trim() || "Command failed" };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { 
        success: false, 
        message: "Operation cancelled by user", 
        cancelled: true 
      };
    }
    
    return { 
      success: false, 
      message: error instanceof Error ? error.message : String(error) 
    };
  } finally {
    // Ensure we clean up child process streams
    if (child) {
      try {
        await child.stdout.cancel();
      } catch {}
      try {
        await child.stderr.cancel();
      } catch {}
    }
  }
}