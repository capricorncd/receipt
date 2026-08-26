import { contextBridge, ipcRenderer, webUtils } from 'electron';

/** 主进程推送的目录变更事件 */
export type DirChangedPayload = { event: 'add' | 'unlink' | 'change'; fullPath: string };

/**
 * 仅在此处向渲染进程暴露允许调用的 IPC 方法，禁止暴露整个 ipcRenderer。
 * 对应 .cursorrules：nodeIntegration=false, contextIsolation=true，通过 preload 桥接。
 */
const electronAPI = {
  ping(): Promise<'pong'> {
    return ipcRenderer.invoke('app:ping') as Promise<'pong'>;
  },
  /** 打开文件夹对话框，返回选择的目录路径；并开始 chokidar 监听 */
  openDirectory(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:openDirectory') as Promise<string | null>;
  },
  /** 选择批量导出的目标目录（不加入工作目录） */
  chooseOutputDirectory(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:chooseOutputDirectory') as Promise<string | null>;
  },
  /** 从拖放得到的 File 获取本地路径（仅在 preload 中可用，contextIsolation 下必须经此桥接） */
  getPathForDroppedFile(file: File): string {
    try {
      return webUtils.getPathForFile(file) ?? '';
    } catch {
      return '';
    }
  },
  /** 拖入路径（文件或文件夹）：校验后加入已打开列表并监听，返回解析后的目录路径或 null */
  addDirectoryByPath(dirPath: string): Promise<string | null> {
    return ipcRenderer.invoke('dialog:addDirectoryByPath', dirPath) as Promise<string | null>;
  },
  listImages(dirPath: string): Promise<{ entries: string[]; total: number }> {
    return ipcRenderer.invoke('fs:listImages', dirPath) as Promise<{
      entries: string[];
      total: number;
    }>;
  },
  /** 列出目录下全部文件（小票管理用） */
  listFiles(dirPath: string): Promise<{ entries: string[]; total: number }> {
    return ipcRenderer.invoke('fs:listFiles', dirPath) as Promise<{
      entries: string[];
      total: number;
    }>;
  },
  /** 列出目录下一层子目录路径，用于左侧目录树 */
  listDirs(dirPath: string): Promise<string[]> {
    return ipcRenderer.invoke('fs:listDirs', dirPath) as Promise<string[]>;
  },
  /** 从列表中移除目录并停止监听 */
  removeDirectory(dirPath: string): Promise<void> {
    return ipcRenderer.invoke('fs:removeDirectory', dirPath) as Promise<void>;
  },
  /** 重命名目录（同级改名），返回新路径 */
  renameDirectory(
    dirPath: string,
    newName: string
  ): Promise<{ ok: boolean; newPath?: string; error?: string }> {
    return ipcRenderer.invoke('fs:renameDir', dirPath, newName) as Promise<{
      ok: boolean;
      newPath?: string;
      error?: string;
    }>;
  },
  /** 检查目录下是否存在同名文件 */
  fileExistsInDir(dirPath: string, fileName: string): Promise<boolean> {
    return ipcRenderer.invoke('fs:fileExistsInDir', dirPath, fileName) as Promise<boolean>;
  },
  /** 在当前目录下创建小票文本文件 */
  createReceiptFile(
    dirPath: string,
    fileName: string,
    content: string,
    overwrite?: boolean
  ): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke('fs:createReceiptFile', dirPath, fileName, content, overwrite) as Promise<{
      ok: boolean;
      filePath?: string;
      error?: string;
    }>;
  },
  /** 将图片编辑器导出的图片（data URL）写入当前目录下的文件，可原地覆盖或另存为新文件名 */
  writeImage(
    dirPath: string,
    fileName: string,
    dataUrl: string,
    overwrite?: boolean
  ): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke('fs:writeImage', dirPath, fileName, dataUrl, overwrite) as Promise<{
      ok: boolean;
      filePath?: string;
      error?: string;
    }>;
  },
  /** 弹出系统文件选择器，选择待添加的小票源文件，返回其绝对路径 */
  selectReceiptSourceFile(): Promise<string | null> {
    return ipcRenderer.invoke('dialog:selectReceiptSourceFile') as Promise<string | null>;
  },
  /** 预览尚未导入的外部文件（不受已打开目录限制） */
  getPickedFilePreviewInfo(filePath: string): Promise<{ kind: string; fileName: string }> {
    return ipcRenderer.invoke('fs:getPickedFilePreviewInfo', filePath) as Promise<{
      kind: string;
      fileName: string;
    }>;
  },
  readPickedTextPreview(
    filePath: string
  ): Promise<{ content: string; truncated: boolean } | { error: string }> {
    return ipcRenderer.invoke('fs:readPickedTextPreview', filePath) as Promise<
      { content: string; truncated: boolean } | { error: string }
    >;
  },
  readPickedFileDataUrl(filePath: string): Promise<{ dataUrl: string } | { error: string }> {
    return ipcRenderer.invoke('fs:readPickedFileDataUrl', filePath) as Promise<
      { dataUrl: string } | { error: string }
    >;
  },
  /** 用系统默认应用打开尚未导入的外部文件 */
  openPickedPath(filePath: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('fs:openPickedPath', filePath) as Promise<{
      ok: boolean;
      error?: string;
    }>;
  },
  /** 将选中的源文件保存一份到当前目录，使用生成的小票文件名（保留原文件） */
  importReceiptFile(
    sourcePath: string,
    dirPath: string,
    fileName: string,
    overwrite?: boolean
  ): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke(
      'fs:importReceiptFile',
      sourcePath,
      dirPath,
      fileName,
      overwrite
    ) as Promise<{ ok: boolean; filePath?: string; error?: string }>;
  },
  /** 删除文件（仅限当前工作目录内） */
  deleteFile(filePath: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('fs:deleteFile', filePath) as Promise<{ ok: boolean; error?: string }>;
  },
  getFilePreviewInfo(filePath: string): Promise<{ kind: string; fileName: string }> {
    return ipcRenderer.invoke('fs:getFilePreviewInfo', filePath) as Promise<{
      kind: string;
      fileName: string;
    }>;
  },
  readTextPreview(
    filePath: string
  ): Promise<{ content: string; truncated: boolean } | { error: string }> {
    return ipcRenderer.invoke('fs:readTextPreview', filePath) as Promise<
      { content: string; truncated: boolean } | { error: string }
    >;
  },
  readFileDataUrl(filePath: string): Promise<{ dataUrl: string } | { error: string }> {
    return ipcRenderer.invoke('fs:readFileDataUrl', filePath) as Promise<
      { dataUrl: string } | { error: string }
    >;
  },
  renameFile(
    filePath: string,
    newFileName: string,
    overwrite?: boolean
  ): Promise<{ ok: boolean; newPath?: string; error?: string }> {
    return ipcRenderer.invoke('fs:renameFile', filePath, newFileName, overwrite) as Promise<{
      ok: boolean;
      newPath?: string;
      error?: string;
    }>;
  },
  /** 在同目录下复制一份文件，新文件名自动追加 Copy 后缀 */
  copyFile(filePath: string): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke('fs:copyFile', filePath) as Promise<{
      ok: boolean;
      filePath?: string;
      error?: string;
    }>;
  },
  openPath(filePath: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('fs:openPath', filePath) as Promise<{ ok: boolean; error?: string }>;
  },
  /** 在文件管理器中打开所在目录并选中文件 */
  showItemInFolder(filePath: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('fs:showItemInFolder', filePath) as Promise<{
      ok: boolean;
      error?: string;
    }>;
  },
  exportCsv(payload: {
    directory: string;
    baseName: string;
    title: string;
    headers: string[];
    rows: string[][];
    footer?: string[];
  }): Promise<{ ok: boolean; cancelled?: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke('export:csv', payload) as Promise<{
      ok: boolean;
      cancelled?: boolean;
      filePath?: string;
      error?: string;
    }>;
  },
  exportPdf(payload: {
    directory: string;
    baseName: string;
    title: string;
    headers: string[];
    rows: string[][];
    footer?: string[];
  }): Promise<{ ok: boolean; cancelled?: boolean; filePath?: string; error?: string }> {
    return ipcRenderer.invoke('export:pdf', payload) as Promise<{
      ok: boolean;
      cancelled?: boolean;
      filePath?: string;
      error?: string;
    }>;
  },
  /** 由主进程构建默认保存路径（与 originalPath 同目录、同后缀），保证路径格式正确 */
  buildSavePath(originalPath: string, nameNoExt: string): Promise<string> {
    return ipcRenderer.invoke('path:buildSavePath', originalPath, nameNoExt) as Promise<string>;
  },
  /** 在主进程内直接弹出另存为对话框（带建议文件名），返回用户选择路径；取消或出错返回 null */
  showSaveDialogWithSuggestedName(originalPath: string, nameNoExt: string): Promise<string | null> {
    return ipcRenderer.invoke('dialog:saveFileWithSuggestedName', originalPath, nameNoExt) as Promise<
      string | null
    >;
  },
  /** 另存为对话框，返回用户选择的目标路径 */
  showSaveDialog(defaultPath: string): Promise<string | null> {
    return ipcRenderer.invoke('dialog:saveFile', defaultPath) as Promise<string | null>;
  },
  /** 读取图片 SD 元数据（优先 PNG parameters，其次 EXIF UserComment） */
  readImageMetadata(filePath: string): Promise<import('./types/metadata.js').PNGMetadata | null> {
    return ipcRenderer.invoke('metadata:read', filePath) as Promise<
      import('./types/metadata.js').PNGMetadata | null
    >;
  },
  /** 另存为：复制到新路径并写入元数据，不覆盖原图 */
  saveImageWithMetadata(
    originalPath: string,
    targetPath: string,
    meta: import('./types/metadata.js').SDImageMetadata
  ): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('metadata:saveAs', originalPath, targetPath, meta) as Promise<{
      ok: boolean;
      error?: string;
    }>;
  },
  /** 原地覆盖写入元数据（仅当用户明确选择覆盖时调用） */
  writeImageMetadata(
    filePath: string,
    meta: import('./types/metadata.js').SDImageMetadata
  ): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('metadata:write', filePath, meta) as Promise<{
      ok: boolean;
      error?: string;
      meta?: import('./types/metadata.js').PNGMetadata | null;
    }>;
  },
  /** 订阅当前打开目录的文件变更（chokidar 推送，非轮询） */
  onDirChanged(callback: (payload: DirChangedPayload) => void): () => void {
    const handler = (_: unknown, payload: DirChangedPayload) => callback(payload);
    ipcRenderer.on('fs:dir-changed', handler);
    return () => {
      ipcRenderer.removeListener('fs:dir-changed', handler);
    };
  },
  /** 订阅语言切换（File > Language 菜单触发） */
  onLocaleChange(callback: (locale: string) => void): () => void {
    const handler = (_: unknown, locale: string) => callback(locale);
    ipcRenderer.on('app:locale', handler);
    return () => {
      ipcRenderer.removeListener('app:locale', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type PreloadAPI = typeof electronAPI;
