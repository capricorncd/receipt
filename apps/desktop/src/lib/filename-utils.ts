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
