import { MockDenops } from "./dispatchers.ts";

export class ExecutionLogger {
  private logs: string[] = [];
  private maxLogs = 1000;
  private isShowing = false;
  
  constructor(private mockDenops: MockDenops) {}
  
  async addLog(message: string): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    this.logs.push(`[${timestamp}] ${message}`);
    
    // メモリ制限
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // リアルタイム表示が有効な場合
    if (this.isShowing) {
      await this.mockDenops.cmd(`echom "${this.escapeVimString(message)}"`);
    }
  }
  
  async showLogs(): Promise<void> {
    if (this.logs.length === 0) {
      await this.mockDenops.cmd('echo "No execution logs available"');
      return;
    }
    
    // Neovimの新しいバッファにログを表示
    await this.mockDenops.cmd('vnew');
    await this.mockDenops.cmd('setlocal buftype=nofile');
    await this.mockDenops.cmd('setlocal bufhidden=delete');
    await this.mockDenops.cmd('setlocal noswapfile');
    await this.mockDenops.cmd('setlocal nomodifiable');
    await this.mockDenops.cmd('file SnapshotRunner-ExecutionLog');
    
    // ログをバッファに追加
    await this.mockDenops.cmd('setlocal modifiable');
    for (const log of this.logs) {
      await this.mockDenops.cmd(`call append(line('$'), '${this.escapeVimString(log)}')`);
    }
    await this.mockDenops.cmd('normal! ggdd'); // 最初の空行を削除
    await this.mockDenops.cmd('setlocal nomodifiable');
    
    // シンタックスハイライト
    await this.mockDenops.cmd('syntax match SnapshotLogTime /\\[\\d\\d:\\d\\d:\\d\\d\\]/');
    await this.mockDenops.cmd('syntax match SnapshotLogError /ERROR.*/');
    await this.mockDenops.cmd('syntax match SnapshotLogSuccess /SUCCESS.*/');
    await this.mockDenops.cmd('highlight SnapshotLogTime ctermfg=Gray guifg=Gray');
    await this.mockDenops.cmd('highlight SnapshotLogError ctermfg=Red guifg=Red');
    await this.mockDenops.cmd('highlight SnapshotLogSuccess ctermfg=Green guifg=Green');
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  enableRealtimeDisplay(): void {
    this.isShowing = true;
  }
  
  disableRealtimeDisplay(): void {
    this.isShowing = false;
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
}

// グローバルログインスタンス
let globalLogger: ExecutionLogger | null = null;

export function getExecutionLogger(mockDenops: MockDenops): ExecutionLogger {
  if (!globalLogger) {
    globalLogger = new ExecutionLogger(mockDenops);
  }
  return globalLogger;
}