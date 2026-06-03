import fs from 'fs';
import path from 'path';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const PDF_EXT = new Set(['.pdf']);
const TEXT_EXT = new Set([
  '.txt',
  '.csv',
  '.json',
  '.md',
  '.log',
  '.xml',
  '.html',
  '.htm',
  '.yaml',
  '.yml',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
]);

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain;charset=utf-8',
  '.csv': 'text/plain;charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/plain;charset=utf-8',
  '.html': 'text/html;charset=utf-8',
  '.htm': 'text/html;charset=utf-8',
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function getPreviewKind(filePath: string): PreviewKind {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (PDF_EXT.has(ext)) return 'pdf';
  if (TEXT_EXT.has(ext)) return 'text';
  return 'unsupported';
}

const MAX_TEXT_BYTES = 512 * 1024;

export async function readTextPreview(
  filePath: string
): Promise<{ content: string; truncated: boolean }> {
  const buf = await fs.promises.readFile(filePath);
  const truncated = buf.length > MAX_TEXT_BYTES;
  const slice = truncated ? buf.subarray(0, MAX_TEXT_BYTES) : buf;
  let content = slice.toString('utf8');
  if (truncated) content += '\n\n…';
  return { content, truncated };
}

/** 读取文件为 data URL，供 PDF 等内嵌预览 */
export async function readFileAsDataUrl(filePath: string): Promise<string> {
  const buf = await fs.promises.readFile(filePath);
  const mime = getMimeType(filePath);
  const base64 = buf.toString('base64');
  return `data:${mime};base64,${base64}`;
}
