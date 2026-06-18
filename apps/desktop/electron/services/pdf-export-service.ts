import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import { buildPdfHtml, type ExportTablePayload } from './export-service.js';

const PDF_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/** 临时 HTML + Electron 原生 printToPDF */
export async function writePdfFile(filePath: string, payload: ExportTablePayload): Promise<void> {
  const html = buildPdfHtml(payload);
  const tmpDir = await fs.promises.mkdtemp(path.join(app.getPath('temp'), 'receipt-pdf-'));
  const tmpHtml = path.join(tmpDir, 'export.html');
  await fs.promises.writeFile(tmpHtml, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
    },
  });

  try {
    // loadFile 的 Promise 在页面加载完成时 resolve，无需再监听 did-finish-load
    await withTimeout(win.loadFile(tmpHtml), PDF_TIMEOUT_MS, 'PDF 生成超时');

    const pdf = await withTimeout(
      win.webContents.printToPDF({
        printBackground: true,
        margins: { marginType: 'default' },
      }),
      PDF_TIMEOUT_MS,
      'PDF 生成超时'
    );
    await fs.promises.writeFile(filePath, pdf);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
