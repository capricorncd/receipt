import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { isPathUnderBase } from './path-validator.js';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);

function isImageFile(name: string): boolean {
  return IMAGE_EXT.has(path.extname(name).toLowerCase());
}

/**
 * 列出目录下的子目录路径（一层），用于左侧目录树。
 */
export async function listDirectories(dirPath: string): Promise<string[]> {
  const names = await fs.promises.readdir(dirPath, { withFileTypes: true });
  return names
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dirPath, d.name))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * 分页列出目录中的图片文件路径（相对或绝对由调用方决定）。
 * 不一次性读入全部到内存后只取一页：先 readdir 再过滤再 slice，避免大目录时前端卡死。
 */
export async function listImageFiles(dirPath: string): Promise<{ entries: string[]; total: number }> {
  const names = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = names
    .filter((d) => d.isFile() && isImageFile(d.name))
    .map((d) => path.join(dirPath, d.name))
    .sort((a, b) => a.localeCompare(b));
  const total = files.length;
  return { entries: files, total };
}

/** 列出目录中的全部文件（一层，不含子目录） */
export async function listAllFiles(dirPath: string): Promise<{ entries: string[]; total: number }> {
  const names = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = names
    .filter((d) => d.isFile())
    .map((d) => path.join(dirPath, d.name))
    .sort((a, b) => a.localeCompare(b));
  return { entries: files, total: files.length };
}

const watchers = new Map<string, FSWatcher>();

/**
 * 使用 chokidar 监听目录变化（不轮询）。同一目录多次调用会复用同一 watcher。
 * 变更时通过 onEvent 回调通知（由 IPC 层转发给渲染进程）。
 */
export function watchDirectory(
  dirPath: string,
  onEvent: (event: 'add' | 'unlink' | 'change', fullPath: string) => void
): () => void {
  const key = path.normalize(path.resolve(dirPath));
  const existing = watchers.get(key);
  if (existing) {
    return () => {
      existing.close();
      watchers.delete(key);
    };
  }
  const watcher = chokidar.watch(key, {
    persistent: true,
    ignoreInitial: true,
    depth: 1,
  });
  watcher
    .on('add', (p) => onEvent('add', p))
    .on('unlink', (p) => onEvent('unlink', p))
    .on('change', (p) => onEvent('change', p));
  watchers.set(key, watcher);
  return () => {
    watcher.close();
    watchers.delete(key);
  };
}

/** 检查目录下是否存在同名文件 */
export function fileExistsInDir(dirPath: string, fileName: string): boolean {
  if (!fileName || /[/\\]/.test(fileName)) return false;
  return fs.existsSync(path.join(dirPath, fileName));
}

/** 在指定目录下创建文本文件 */
export async function createTextFile(
  dirPath: string,
  fileName: string,
  content: string,
  overwrite = false
): Promise<string> {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('无效文件名');
  }
  if (/[/\\]/.test(fileName)) {
    throw new Error('文件名不能包含路径分隔符');
  }
  const filePath = path.join(dirPath, fileName);
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error('目标文件已存在');
  }
  await fs.promises.writeFile(filePath, content, 'utf8');
  return filePath;
}

/** 将 data URL（图片编辑器导出的 PNG/JPEG/WebP）解码后写入指定路径，可选覆盖 */
export async function writeImageFile(filePath: string, dataUrl: string, overwrite = false): Promise<void> {
  const match = /^data:[^;]+;base64,(.*)$/.exec(dataUrl);
  if (!match) {
    throw new Error('无效的图片数据');
  }
  if (fs.existsSync(filePath) && !overwrite) {
    throw new Error('目标文件已存在');
  }
  const buffer = Buffer.from(match[1]!, 'base64');
  await fs.promises.writeFile(filePath, buffer);
}

/** 重命名文件，可选覆盖已存在的目标文件 */
export async function renameFileInPlace(
  filePath: string,
  newFileName: string,
  overwrite = false
): Promise<string> {
  const trimmed = typeof newFileName === 'string' ? newFileName.trim() : '';
  if (!trimmed) throw new Error('文件名不能为空');
  if (/[/\\]/.test(trimmed)) {
    throw new Error('文件名不能包含路径分隔符');
  }
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  const newPath = path.join(dir, trimmed);
  if (path.resolve(newPath) === resolved) {
    return resolved;
  }
  if (fs.existsSync(newPath)) {
    if (!overwrite) throw new Error('目标文件已存在');
    await fs.promises.unlink(newPath);
  }
  await fs.promises.rename(resolved, newPath);
  return newPath;
}

/** 将系统文件选择器选中的外部文件保存一份到指定目录，使用新文件名（不改动原文件） */
export async function importFile(
  sourcePath: string,
  dirPath: string,
  fileName: string,
  overwrite = false
): Promise<string> {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('无效文件名');
  }
  if (/[/\\]/.test(fileName)) {
    throw new Error('文件名不能包含路径分隔符');
  }
  const resolvedSource = path.resolve(sourcePath);
  const stat = await fs.promises.stat(resolvedSource).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error('源文件不存在');
  }
  const targetPath = path.join(dirPath, fileName);
  if (fs.existsSync(targetPath) && !overwrite) {
    throw new Error('目标文件已存在');
  }
  await fs.promises.copyFile(resolvedSource, targetPath);
  return targetPath;
}

/** 在同目录下复制一份文件，新文件名为原文件名（不含扩展名）后追加 Copy，重名时依次追加 Copy2、Copy3… */
export async function copyFileInPlace(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  const ext = path.extname(resolved);
  const base = path.basename(resolved, ext);

  let candidate = `${base}Copy${ext}`;
  let n = 2;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}Copy${n}${ext}`;
    n += 1;
  }

  const targetPath = path.join(dir, candidate);
  await fs.promises.copyFile(resolved, targetPath);
  return targetPath;
}

/** 校验 path 是否在 base 下（用于 IPC 前的路径校验） */
export { isPathUnderBase };
