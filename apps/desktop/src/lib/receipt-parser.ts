import type { ReceiptRecord, TaxDeclareAmount } from '../types/receipt';

function isNumberLike(s: string): boolean {
  return /^\d+(\.\d+)?$/.test(s);
}

function toNumber(s: string): number {
  const n = parseFloat(s);
  if (Number.isNaN(n)) throw new Error(`无效数字: ${s}`);
  return n;
}

function parseFraction(s: string): { num: number; den: number } | null {
  const m = s.match(/^(\d+)_(\d+)$/);
  if (!m) return null;
  return { num: toNumber(m[1]), den: toNumber(m[2]) };
}

/**
 * 解析价格段，支持：
 * - 300 / 10000
 * - 10000x0.5
 * - 10000x1_3
 * - 10000x0.8x1_3x3_12
 */
export function formatPrice(input: string): TaxDeclareAmount {
  const parts = input.split('x');
  const amount = parseFloat(parts[0] ?? '');
  if (Number.isNaN(amount)) {
    throw new Error(`价格格式错误: ${input}`);
  }

  let declareRate = 1;
  let period = 1;
  let currentPeriod = 1;
  let yearUsageNum: number | null = null;
  let yearUsageDen: number | null = null;
  const fractions: { num: number; den: number }[] = [];

  for (const part of parts.slice(1)) {
    if (isNumberLike(part)) {
      declareRate = toNumber(part);
    } else {
      const frac = parseFraction(part);
      if (!frac) throw new Error(`价格申报分期格式错误: ${input}`);
      fractions.push(frac);
    }
  }

  if (fractions.length >= 1) {
    currentPeriod = fractions[0]!.num;
    period = fractions[0]!.den;
  }
  if (fractions.length >= 2) {
    yearUsageNum = fractions[1]!.num;
    yearUsageDen = fractions[1]!.den;
  }

  let base: number;
  if (period > 1) {
    base = (amount * declareRate) / period;
  } else {
    base = amount * declareRate;
  }
  if (yearUsageNum != null && yearUsageDen != null && yearUsageDen > 0) {
    base *= yearUsageNum / yearUsageDen;
  }

  return {
    amount,
    period,
    currentPeriod,
    declareRate,
    yearUsageNum,
    yearUsageDen,
    declareAmount: Math.ceil(base),
  };
}

/** yyyyMMdd + HHmmss → yyyy-MM-dd */
export function formatDisplayDate(date: string, time?: string): string {
  if (!/^\d{8}$/.test(date)) throw new Error(`日期格式错误: ${date}`);
  const y = date.slice(0, 4);
  const m = date.slice(4, 6);
  const d = date.slice(6, 8);
  if (time && /^\d+$/.test(time)) {
    const t = time.padStart(6, '0').slice(0, 6);
    const hh = t.slice(0, 2);
    const mm = t.slice(2, 4);
    const ss = t.slice(4, 6);
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }
  return `${y}-${m}-${d}`;
}

function normalizeType(type: string, descriptions: string[]): string {
  if (type === '保険') {
    return descriptions.includes('年金') ? '年金' : '国保';
  }
  return type;
}

/**
 * 解析小票文件名
 * yyyyMMdd-HHmmss-price-type-description.ext
 */
export function parseReceiptFileName(fileName: string, filePath: string): ReceiptRecord {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) {
    throw new Error(`文件名格式错误: ${fileName}`);
  }
  const name = fileName.slice(0, lastDot);
  const ext = fileName.slice(lastDot + 1);

  const segments = name.split('-');
  if (segments.length < 5) {
    throw new Error(`文件名格式错误: ${fileName}`);
  }

  const [dateRaw, timeRaw, priceStr, type, ...descParts] = segments;
  if (!/^\d{8}$/.test(dateRaw ?? '')) {
    throw new Error(`日期格式错误: ${fileName}`);
  }
  if (!/^\d{4,6}$/.test(timeRaw ?? '')) {
    throw new Error(`时间格式错误: ${fileName}`);
  }

  const description = descParts.join('-');
  const cost = formatPrice(priceStr ?? '');
  const newType = normalizeType(type ?? '', descParts);

  return {
    date: formatDisplayDate(dateRaw!, timeRaw),
    dateRaw: dateRaw!,
    timeRaw: timeRaw!,
    type: newType,
    description,
    cost,
    ext,
    name,
    filePath,
    fileName,
  };
}

export function tryParseReceiptFileName(
  fileName: string,
  filePath: string
): ReceiptRecord | null {
  try {
    return parseReceiptFileName(fileName, filePath);
  } catch {
    return null;
  }
}

export function formatDeclareRate(rate: number): string {
  if (rate === 1) return '100%';
  const pct = Math.round(rate * 1000) / 10;
  return `${pct}%`;
}

export function formatPeriod(cost: TaxDeclareAmount): string {
  if (cost.period <= 1) return '1';
  return `${cost.currentPeriod}/${cost.period}`;
}

/** 使用比例，未指定时默认为 1 */
export function formatUsageRatio(cost: TaxDeclareAmount): string {
  if (cost.yearUsageNum == null || cost.yearUsageDen == null) return '1';
  return `${cost.yearUsageNum}/${cost.yearUsageDen}`;
}

export interface ParsedFolderFiles {
  receipts: ReceiptRecord[];
  otherFiles: { fileName: string; filePath: string }[];
}

export function classifyFolderFiles(filePaths: string[]): ParsedFolderFiles {
  const receipts: ReceiptRecord[] = [];
  const otherFiles: { fileName: string; filePath: string }[] = [];

  for (const filePath of filePaths) {
    const fileName = filePath.replace(/^.*[/\\]/, '') || filePath;
    const parsed = tryParseReceiptFileName(fileName, filePath);
    if (parsed) {
      receipts.push(parsed);
    } else {
      otherFiles.push({ fileName, filePath });
    }
  }

  receipts.sort((a, b) => {
    const da = `${a.dateRaw}${a.timeRaw}`;
    const db = `${b.dateRaw}${b.timeRaw}`;
    return da.localeCompare(db);
  });
  otherFiles.sort((a, b) => a.fileName.localeCompare(b.fileName));

  return { receipts, otherFiles };
}
