import type { ReceiptRecord } from '../types/receipt';
import type { ExportTablePayload } from '../types/export';
import { formatDeclareRate, formatPeriod, formatUsageRatio } from './receipt-parser';

export interface ExportLabels {
  colDate: string;
  colCategory: string;
  colAmount: string;
  colPeriod: string;
  colUsageRatio: string;
  colRatio: string;
  colEffectiveAmount: string;
  colDescription: string;
  colFileName: string;
  totalLabel: string;
}

export function buildExportPayload(
  receipts: ReceiptRecord[],
  directory: string,
  baseName: string,
  title: string,
  labels: ExportLabels,
  totals: { totalAmount: number; totalEffective: number }
): ExportTablePayload {
  const rows = receipts.map((r) => [
    r.date,
    r.type,
    String(r.cost.amount),
    formatPeriod(r.cost),
    formatUsageRatio(r.cost),
    formatDeclareRate(r.cost.declareRate),
    String(r.cost.declareAmount),
    r.description,
    r.fileName,
  ]);

  return {
    directory,
    baseName,
    title,
    headers: [
      labels.colDate,
      labels.colCategory,
      labels.colAmount,
      labels.colPeriod,
      labels.colUsageRatio,
      labels.colRatio,
      labels.colEffectiveAmount,
      labels.colDescription,
      labels.colFileName,
    ],
    rows,
    footer: [
      labels.totalLabel,
      '',
      String(totals.totalAmount),
      '',
      '',
      '',
      String(totals.totalEffective),
      '',
      '',
    ],
  };
}
