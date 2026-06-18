import fs from 'fs';
import path from 'path';
import { app, BrowserWindow } from 'electron';
import { buildPdfHtml, type ExportTablePayload } from './export-service.js';

const PDF_TIMEOUT_MS = 120_000;

/** 临时 HTML + Electron 原生 printToPDF（Electron 不支持 puppeteer 的 Page.printToPDF） */
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
    await win.loadFile(tmpHtml);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PDF 生成超时')), PDF_TIMEOUT_MS);
      win.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });
    });
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'default' },
    });
    await fs.promises.writeFile(filePath, pdf);
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
