// プラグイン設定管理

export interface PluginConfig {
  testCommand?: string;
  testRunner?: 'auto' | 'jest' | 'vitest';
  showNotifications?: boolean;
  autoSaveBeforeRun?: boolean;
  timeout?: number;
  customTestPatterns?: string[];
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
  ]
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
 * Vim設定の型定義
 */
export interface VimConfig {
  test_command?: unknown;
  test_runner?: unknown;
  show_notifications?: unknown;
  auto_save_before_run?: unknown;
  timeout?: unknown;
  custom_test_patterns?: unknown;
}

/**
 * Vim変数から設定を読み込み
 */
export function loadConfigFromVim(vimConfig: unknown): void {
  if (!vimConfig || typeof vimConfig !== 'object') return;
  
  const typedConfig = vimConfig as VimConfig;
  const config: Partial<PluginConfig> = {};
  
  if (typeof typedConfig.test_command === 'string') {
    config.testCommand = typedConfig.test_command;
  }
  
  if (typeof typedConfig.test_runner === 'string' && 
      ['auto', 'jest', 'vitest'].includes(typedConfig.test_runner)) {
    config.testRunner = typedConfig.test_runner as 'auto' | 'jest' | 'vitest';
  }
  
  if (typeof typedConfig.show_notifications === 'boolean') {
    config.showNotifications = typedConfig.show_notifications;
  }
  
  if (typeof typedConfig.auto_save_before_run === 'boolean') {
    config.autoSaveBeforeRun = typedConfig.auto_save_before_run;
  }
  
  if (typeof typedConfig.timeout === 'number' && typedConfig.timeout > 0) {
    config.timeout = typedConfig.timeout;
  }
  
  if (Array.isArray(typedConfig.custom_test_patterns)) {
    config.customTestPatterns = typedConfig.custom_test_patterns.filter(
      (pattern: unknown): pattern is string => typeof pattern === 'string'
    );
  }
  
  updateConfig(config);
}