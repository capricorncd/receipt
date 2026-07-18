/** 从目录路径中提取年份（向上查找名为 20xx 的目录段） */
export function extractYearFromDir(dirPath: string): number | null {
  const parts = dirPath.split(/[/\\]/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i]!.match(/^(20\d{2})$/);
    if (m) return parseInt(m[1]!, 10);
  }
  return null;
}

/** 默认日期：年份取目录所在年（若无则为今年），月日为今天 */
export function getDefaultReceiptDate(dirPath: string): string {
  const today = new Date();
  const year = extractYearFromDir(dirPath) ?? today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export interface ReceiptFileNameInput {
  dateRaw: string;
  timeRaw: string;
  price: string;
  type: string;
  description: string;
  /** 文件后缀（含 `.`），默认 `.txt` */
  ext?: string;
}

export function buildReceiptFileName(input: ReceiptFileNameInput): string {
  const desc = input.description.trim() || 'memo';
  const ext = input.ext || '.txt';
  return `${input.dateRaw}-${input.timeRaw}-${input.price.trim()}-${input.type.trim()}-${desc}${ext}`;
}

/** 将 yyyy-MM-dd 转为 yyyyMMdd */
export function toDateRaw(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) throw new Error('日期格式错误');
  return `${y}${m.padStart(2, '0')}${d.padStart(2, '0')}`;
}

/**
 * 时分秒均未选择时返回 120000；否则缺失部分补 00。
 */
export function resolveTimeRaw(hour: string, minute: string, second: string): string {
  if (!hour && !minute && !second) return '120000';
  const h = (hour || '00').padStart(2, '0');
  const m = (minute || '00').padStart(2, '0');
  const s = (second || '00').padStart(2, '0');
  return `${h}${m}${s}`;
}
