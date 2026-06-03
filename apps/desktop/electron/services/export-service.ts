import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';

export interface ExportTablePayload {
  directory: string;
  baseName: string;
  title: string;
  headers: string[];
  rows: string[][];
  footer?: string[];
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsvContent(payload: ExportTablePayload): string {
  const lines = [
    payload.headers.map(escapeCsvCell).join(','),
    ...payload.rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  if (payload.footer?.length) {
    lines.push(payload.footer.map(escapeCsvCell).join(','));
  }
  return lines.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPdfHtml(payload: ExportTablePayload): string {
  const th = payload.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows = payload.rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    )
    .join('');
  const footerRow = payload.footer?.length
    ? `<tr class="footer">${payload.footer.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 16px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-all; }
  th { background: #f0f0f0; font-weight: 600; }
  tr.footer td { font-weight: 600; background: #fafafa; }
  td.num { text-align: right; }
</style>
</head>
<body>
  <h1>${escapeHtml(payload.title)}</h1>
  <table>
    <thead><tr>${th}</tr></thead>
    <tbody>${bodyRows}${footerRow}</tbody>
  </table>
</body>
</html>`;
}

export async function writeCsvFile(filePath: string, payload: ExportTablePayload): Promise<void> {
  const content = '\uFEFF' + buildCsvContent(payload);
  await fs.promises.writeFile(filePath, content, 'utf8');
}

export async function writePdfFile(filePath: string, payload: ExportTablePayload): Promise<void> {
  const html = buildPdfHtml(payload);
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
    },
  });
  try {
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    await win.loadURL(dataUrl);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('PDF 生成超时')), 30000);
      win.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
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
  }
}

export function defaultExportPath(directory: string, baseName: string, ext: string): string {
  const safe = baseName.replace(/[/\\?%*:|"<>]/g, '_');
  return path.join(directory, `${safe}.${ext}`);
}
