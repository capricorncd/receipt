/** 导出表格数据（渲染进程 → 主进程） */
export interface ExportTablePayload {
  /** 默认保存目录（当前打开的文件夹） */
  directory: string;
  /** 默认文件名（不含扩展名） */
  baseName: string;
  /** PDF 标题 */
  title: string;
  headers: string[];
  rows: string[][];
  footer?: string[];
}

export interface ExportResult {
  ok: boolean;
  cancelled?: boolean;
  filePath?: string;
  error?: string;
}
