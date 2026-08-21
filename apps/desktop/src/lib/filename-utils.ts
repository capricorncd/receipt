/** 将文件名拆分为不含后缀的主名与后缀（含 `.`） */
export function splitFileName(fileName: string): { baseName: string; ext: string } {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0) {
    return { baseName: fileName, ext: '' };
  }
  return {
    baseName: fileName.slice(0, lastDot),
    ext: fileName.slice(lastDot),
  };
}

/** 合并主名与后缀为完整文件名 */
export function joinFileName(baseName: string, ext: string): string {
  const trimmed = baseName.trim();
  if (!ext) return trimmed;
  return trimmed + ext;
}

/** 取文件路径的父目录（跨平台，兼容 / 与 \） */
export function getParentDir(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return i >= 0 ? filePath.slice(0, i) : filePath;
}
