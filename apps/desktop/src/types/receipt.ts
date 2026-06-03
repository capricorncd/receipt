/** 税务申报金额（参考 receipt-jp/app） */
export interface TaxDeclareAmount {
  /** 原价 */
  amount: number;
  /** 申报分期总数 */
  period: number;
  /** 当前期数 */
  currentPeriod: number;
  /** 申报比例（默认 1） */
  declareRate: number;
  /** 使用比例分子（可选，如 3_12 的 3；未指定时视为 1） */
  yearUsageNum: number | null;
  /** 使用比例分母（可选，如 3_12 的 12；未指定时视为 1） */
  yearUsageDen: number | null;
  /** 申报金额 */
  declareAmount: number;
}

export interface ReceiptRecord {
  /** 显示用日期 yyyy-MM-dd */
  date: string;
  /** 原始日期段 yyyyMMdd */
  dateRaw: string;
  /** 时间 HHmmss */
  timeRaw: string;
  type: string;
  description: string;
  cost: TaxDeclareAmount;
  ext: string;
  /** 不含扩展名的文件名 */
  name: string;
  /** 完整文件路径 */
  filePath: string;
  /** 完整文件名（含扩展名） */
  fileName: string;
}
