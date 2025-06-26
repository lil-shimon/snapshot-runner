// テストヘルパー関数
export function createMockFile(content: string): string {
  return content.trim();
}

export function createTestFile(testName: string, testContent: string): string {
  return `
import { describe, it, expect } from '@jest/globals';

describe('${testName}', () => {
  ${testContent}
});
  `.trim();
}

export function createTestCase(testName: string, testBody: string): string {
  return `
  it('${testName}', () => {
    ${testBody}
  });
  `.trim();
}