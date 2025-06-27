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
 * Vim変数から設定を読み込み
 */
export function loadConfigFromVim(vimConfig: any): void {
  if (!vimConfig || typeof vimConfig !== 'object') return;
  
  const config: Partial<PluginConfig> = {};
  
  if (typeof vimConfig.test_command === 'string') {
    config.testCommand = vimConfig.test_command;
  }
  
  if (['auto', 'jest', 'vitest'].includes(vimConfig.test_runner)) {
    config.testRunner = vimConfig.test_runner;
  }
  
  if (typeof vimConfig.show_notifications === 'boolean') {
    config.showNotifications = vimConfig.show_notifications;
  }
  
  if (typeof vimConfig.auto_save_before_run === 'boolean') {
    config.autoSaveBeforeRun = vimConfig.auto_save_before_run;
  }
  
  if (typeof vimConfig.timeout === 'number' && vimConfig.timeout > 0) {
    config.timeout = vimConfig.timeout;
  }
  
  if (Array.isArray(vimConfig.custom_test_patterns)) {
    config.customTestPatterns = vimConfig.custom_test_patterns.filter(
      (pattern: any) => typeof pattern === 'string'
    );
  }
  
  updateConfig(config);
}