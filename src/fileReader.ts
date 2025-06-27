// 効率的なファイル読み込みとキャッシュ機能
import { createError, wrapError } from "./errors.ts";

export interface FileReadResult {
  success: boolean;
  content: string[];
  error?: string;
}

export interface FileCache {
  [filePath: string]: {
    content: string[];
    lastModified: number;
  };
}

// ファイル内容のキャッシュ
const fileCache: FileCache = {};

/**
 * 効率的なファイル読み込み
 */
export async function readFileContent(filePath: string): Promise<FileReadResult> {
  try {
    // キャッシュチェック
    const stat = await Deno.stat(filePath);
    const cached = fileCache[filePath];
    
    if (cached && cached.lastModified >= (stat.mtime?.getTime() || 0)) {
      return { success: true, content: cached.content };
    }
    
    // ファイルを一度に読み込み
    const content = await Deno.readTextFile(filePath);
    const lines = content.split('\n');
    
    // キャッシュに保存
    fileCache[filePath] = {
      content: lines,
      lastModified: stat.mtime?.getTime() || Date.now()
    };
    
    return { success: true, content: lines };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      const wrappedError = createError('FILE_NOT_FOUND', `File not found: ${filePath}`, { filePath });
      return { success: false, content: [], error: wrappedError.toUserMessage() };
    }
    const wrappedError = wrapError(error, 'FILE_READ_ERROR');
    return { success: false, content: [], error: wrappedError.toUserMessage() };
  }
}

/**
 * 安全なパス検証
 */
export function validateFilePath(filePath: string): boolean {
  try {
    if (!filePath || typeof filePath !== 'string') {
      throw createError('INVALID_FILE_PATH', 'File path must be a non-empty string', { filePath });
    }
    if (filePath.length === 0) {
      throw createError('INVALID_FILE_PATH', 'File path cannot be empty', { filePath });
    }
    if (filePath.includes('..')) {
      throw createError('INVALID_FILE_PATH', 'Path traversal detected', { filePath });
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'SnapshotRunnerError') {
      // Re-throw our custom errors
      throw error;
    }
    throw wrapError(error, 'INVALID_FILE_PATH');
  }
}

/**
 * 行番号の境界チェック
 */
export function validateLineNumber(lineNumber: number, fileContent: string[]): boolean {
  try {
    if (!Number.isInteger(lineNumber)) {
      throw createError('INVALID_LINE_NUMBER', 'Line number must be an integer', { lineNumber });
    }
    if (lineNumber < 1 || lineNumber > fileContent.length) {
      throw createError(
        'INVALID_LINE_NUMBER',
        `Line number ${lineNumber} is out of bounds (1-${fileContent.length})`,
        { lineNumber, maxLines: fileContent.length }
      );
    }
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'SnapshotRunnerError') {
      // Re-throw our custom errors
      throw error;
    }
    throw wrapError(error, 'INVALID_LINE_NUMBER');
  }
}

/**
 * キャッシュクリア
 */
export function clearFileCache(): void {
  Object.keys(fileCache).forEach(key => delete fileCache[key]);
}