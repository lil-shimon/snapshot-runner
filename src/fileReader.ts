// 効率的なファイル読み込みとキャッシュ機能

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
    
    if (cached && cached.lastModified >= stat.mtime?.getTime() || 0) {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, content: [], error: errorMessage };
  }
}

/**
 * 安全なパス検証
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  if (filePath.length === 0) return false;
  if (filePath.includes('..')) return false; // Path traversal prevention
  return true;
}

/**
 * 行番号の境界チェック
 */
export function validateLineNumber(lineNumber: number, fileContent: string[]): boolean {
  if (!Number.isInteger(lineNumber)) return false;
  if (lineNumber < 1 || lineNumber > fileContent.length) return false;
  return true;
}

/**
 * キャッシュクリア
 */
export function clearFileCache(): void {
  Object.keys(fileCache).forEach(key => delete fileCache[key]);
}