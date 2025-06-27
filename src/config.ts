// プラグイン設定管理

export interface PluginConfig {
  testCommand?: string;
  testRunner?: 'auto' | 'jest' | 'vitest';
  showNotifications?: boolean;
  autoSaveBeforeRun?: boolean;
  timeout?: number;
  customTestPatterns?: string[];
  asyncExecution?: boolean;
  showProgress?: boolean;
  showSpinner?: boolean;
  showElapsedTime?: boolean;
  showPercentage?: boolean;
  progressUpdateInterval?: number;
  showExecutionLog?: boolean;
}

export const DEFAULT_CONFIG: Required<PluginConfig> = {
  testCommand: 'test:fix',
  testRunner: 'auto',
  showNotifications: true,
  autoSaveBeforeRun: false,
  timeout: 30000,
  customTestPatterns: [
    '**/*.test.js',
    '**/*.test.ts',
    '**/*.test.jsx',
    '**/*.test.tsx',
    '**/*.spec.js',
    '**/*.spec.ts',
    '**/*.spec.jsx',
    '**/*.spec.tsx'
  ],
  asyncExecution: true,
  showProgress: true,
  showSpinner: true,
  showElapsedTime: true,
  showPercentage: true,
  progressUpdateInterval: 100,
  showExecutionLog: false
};

let currentConfig: Required<PluginConfig> = { ...DEFAULT_CONFIG };

/**
 * 設定を更新
 */
export function updateConfig(newConfig: Partial<PluginConfig>): void {
  currentConfig = { ...currentConfig, ...newConfig };
}

/**
 * 現在の設定を取得
 */
export function getConfig(): Required<PluginConfig> {
  return { ...currentConfig };
}

/**
 * 設定をリセット
 */
export function resetConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}

/**
 * 型ガード関数群
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && Number.isFinite(value);
}

function isValidTestRunner(value: unknown): value is 'auto' | 'jest' | 'vitest' {
  return typeof value === 'string' && ['auto', 'jest', 'vitest'].includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Vim設定の安全な読み込み関数群
 */
function safeGetTestCommand(obj: Record<string, unknown>): string | undefined {
  const value = obj.test_command;
  return isString(value) ? value : undefined;
}

function safeGetTestRunner(obj: Record<string, unknown>): 'auto' | 'jest' | 'vitest' | undefined {
  const value = obj.test_runner;
  return isValidTestRunner(value) ? value : undefined;
}

function safeGetShowNotifications(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_notifications;
  return isBoolean(value) ? value : undefined;
}

function safeGetAutoSaveBeforeRun(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.auto_save_before_run;
  return isBoolean(value) ? value : undefined;
}

function safeGetTimeout(obj: Record<string, unknown>): number | undefined {
  const value = obj.timeout;
  return isPositiveNumber(value) && value <= 300000 ? value : undefined; // 5分上限
}

function safeGetCustomTestPatterns(obj: Record<string, unknown>): string[] | undefined {
  const value = obj.custom_test_patterns;
  return isStringArray(value) ? value : undefined;
}

function safeGetAsyncExecution(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.async_execution;
  return isBoolean(value) ? value : undefined;
}

function safeGetShowProgress(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_progress;
  return isBoolean(value) ? value : undefined;
}

function safeGetShowSpinner(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_spinner;
  return isBoolean(value) ? value : undefined;
}

function safeGetShowElapsedTime(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_elapsed_time;
  return isBoolean(value) ? value : undefined;
}

function safeGetShowPercentage(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_percentage;
  return isBoolean(value) ? value : undefined;
}

function safeGetProgressUpdateInterval(obj: Record<string, unknown>): number | undefined {
  const value = obj.progress_update_interval;
  return isPositiveNumber(value) && value >= 50 && value <= 1000 ? value : undefined;
}

function safeGetShowExecutionLog(obj: Record<string, unknown>): boolean | undefined {
  const value = obj.show_execution_log;
  return isBoolean(value) ? value : undefined;
}

/**
 * Vim変数から設定を読み込み（型安全版）
 */
export function loadConfigFromVim(vimConfig: unknown): void {
  // 入力検証
  if (!vimConfig || typeof vimConfig !== 'object' || vimConfig === null) {
    return;
  }
  
  const configObj = vimConfig as Record<string, unknown>;
  const config: Partial<PluginConfig> = {};
  
  // 各設定を安全に抽出
  const testCommand = safeGetTestCommand(configObj);
  if (testCommand !== undefined) {
    config.testCommand = testCommand;
  }
  
  const testRunner = safeGetTestRunner(configObj);
  if (testRunner !== undefined) {
    config.testRunner = testRunner;
  }
  
  const showNotifications = safeGetShowNotifications(configObj);
  if (showNotifications !== undefined) {
    config.showNotifications = showNotifications;
  }
  
  const autoSaveBeforeRun = safeGetAutoSaveBeforeRun(configObj);
  if (autoSaveBeforeRun !== undefined) {
    config.autoSaveBeforeRun = autoSaveBeforeRun;
  }
  
  const timeout = safeGetTimeout(configObj);
  if (timeout !== undefined) {
    config.timeout = timeout;
  }
  
  const customTestPatterns = safeGetCustomTestPatterns(configObj);
  if (customTestPatterns !== undefined) {
    config.customTestPatterns = customTestPatterns;
  }
  
  const asyncExecution = safeGetAsyncExecution(configObj);
  if (asyncExecution !== undefined) {
    config.asyncExecution = asyncExecution;
  }
  
  const showProgress = safeGetShowProgress(configObj);
  if (showProgress !== undefined) {
    config.showProgress = showProgress;
  }
  
  const showSpinner = safeGetShowSpinner(configObj);
  if (showSpinner !== undefined) {
    config.showSpinner = showSpinner;
  }
  
  const showElapsedTime = safeGetShowElapsedTime(configObj);
  if (showElapsedTime !== undefined) {
    config.showElapsedTime = showElapsedTime;
  }
  
  const showPercentage = safeGetShowPercentage(configObj);
  if (showPercentage !== undefined) {
    config.showPercentage = showPercentage;
  }
  
  const progressUpdateInterval = safeGetProgressUpdateInterval(configObj);
  if (progressUpdateInterval !== undefined) {
    config.progressUpdateInterval = progressUpdateInterval;
  }
  
  const showExecutionLog = safeGetShowExecutionLog(configObj);
  if (showExecutionLog !== undefined) {
    config.showExecutionLog = showExecutionLog;
  }
  
  updateConfig(config);
}