// エラー型の定義とハンドリング

export type PluginErrorType = 
  | 'FILE_READ_ERROR'
  | 'FILE_NOT_FOUND'
  | 'INVALID_FILE_PATH'
  | 'INVALID_LINE_NUMBER'
  | 'NOT_TEST_FILE'
  | 'NO_TEST_FOUND'
  | 'COMMAND_EXECUTION_ERROR'
  | 'PACKAGE_MANAGER_ERROR'
  | 'CONFIG_VALIDATION_ERROR'
  | 'UNEXPECTED_ERROR';

export interface PluginError {
  type: PluginErrorType;
  message: string;
  details?: unknown;
  cause?: Error;
}

export class SnapshotRunnerError extends Error {
  public readonly type: PluginErrorType;
  public readonly details?: unknown;
  public override readonly cause?: Error;

  constructor(type: PluginErrorType, message: string, details?: unknown, cause?: Error) {
    super(message);
    this.name = 'SnapshotRunnerError';
    this.type = type;
    this.details = details;
    this.cause = cause;
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   */
  toUserMessage(): string {
    const emoji = this.getErrorEmoji();
    return `${emoji} ${this.message}`;
  }

  /**
   * 開発者向けの詳細なエラーメッセージ
   */
  toDetailedMessage(): string {
    let message = `[${this.type}] ${this.message}`;
    if (this.details) {
      message += `\nDetails: ${JSON.stringify(this.details)}`;
    }
    if (this.cause) {
      message += `\nCause: ${this.cause.message}`;
    }
    return message;
  }

  private getErrorEmoji(): string {
    switch (this.type) {
      case 'FILE_READ_ERROR':
      case 'FILE_NOT_FOUND':
        return '📄';
      case 'INVALID_FILE_PATH':
      case 'INVALID_LINE_NUMBER':
        return '⚠️';
      case 'NOT_TEST_FILE':
      case 'NO_TEST_FOUND':
        return '🔍';
      case 'COMMAND_EXECUTION_ERROR':
      case 'PACKAGE_MANAGER_ERROR':
        return '⚡';
      case 'CONFIG_VALIDATION_ERROR':
        return '⚙️';
      case 'UNEXPECTED_ERROR':
      default:
        return '❌';
    }
  }
}

/**
 * エラーファクトリー関数
 */
export function createError(
  type: PluginErrorType,
  message: string,
  details?: unknown,
  cause?: Error
): SnapshotRunnerError {
  return new SnapshotRunnerError(type, message, details, cause);
}

/**
 * 一般的なエラーを型付きエラーに変換
 */
export function wrapError(error: unknown, type: PluginErrorType = 'UNEXPECTED_ERROR'): SnapshotRunnerError {
  if (error instanceof SnapshotRunnerError) {
    return error;
  }
  
  if (error instanceof Error) {
    return createError(type, error.message, undefined, error);
  }
  
  return createError(type, String(error), { originalError: error });
}

/**
 * エラーのユーザーメッセージを生成
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof SnapshotRunnerError) {
    return error.toUserMessage();
  }
  
  if (error instanceof Error) {
    return `❌ ${error.message}`;
  }
  
  return `❌ Unexpected error: ${String(error)}`;
}