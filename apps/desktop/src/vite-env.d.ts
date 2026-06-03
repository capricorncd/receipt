/// <reference types="vite/client" />

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

/** 与 electron/preload.ts 暴露的 API 保持一致 */
declare global {
  interface Window {
    electronAPI: {
      ping(): Promise<'pong'>;
      openDirectory(): Promise<string | null>;
      addDirectoryByPath(dirPath: string): Promise<string | null>;
      listFiles(dirPath: string): Promise<{ entries: string[]; total: number }>;
      removeDirectory(dirPath: string): Promise<void>;
      renameDirectory(
        dirPath: string,
        newName: string
      ): Promise<{ ok: boolean; newPath?: string; error?: string }>;
      getPathForDroppedFile(file: File): string;
      getFilePreviewInfo(filePath: string): Promise<{ kind: PreviewKind; fileName: string }>;
      readTextPreview(
        filePath: string
      ): Promise<{ content: string; truncated: boolean } | { error: string }>;
      readFileDataUrl(filePath: string): Promise<{ dataUrl: string } | { error: string }>;
      renameFile(
        filePath: string,
        newFileName: string
      ): Promise<{ ok: boolean; newPath?: string; error?: string }>;
      openPath(filePath: string): Promise<{ ok: boolean; error?: string }>;
      exportCsv(payload: import('./types/export').ExportTablePayload): Promise<import('./types/export').ExportResult>;
      exportPdf(payload: import('./types/export').ExportTablePayload): Promise<import('./types/export').ExportResult>;
      onDirChanged(
        callback: (payload: { event: 'add' | 'unlink' | 'change'; fullPath: string }) => void
      ): () => void;
      onLocaleChange(callback: (locale: string) => void): () => void;
    };
  }
}

export {};
