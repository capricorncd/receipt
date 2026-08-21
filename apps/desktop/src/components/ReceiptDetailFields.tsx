import { HOUR_OPTIONS, MIN_SEC_OPTIONS, CATEGORY_OTHER } from '../lib/receipt-form-options';
import { t } from '../i18n';

interface ReceiptDetailFieldsProps {
  date: string;
  onDateChange: (value: string) => void;
  hour: string;
  onHourChange: (value: string) => void;
  minute: string;
  onMinuteChange: (value: string) => void;
  second: string;
  onSecondChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  categoryKey: string;
  onCategoryKeyChange: (value: string) => void;
  customType: string;
  onCustomTypeChange: (value: string) => void;
  categories: string[];
  description: string;
  onDescriptionChange: (value: string) => void;
}

const inputClass =
  'w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/50';

/** 日期/时间/金额/类别/描述编辑区，供新增与预览编辑弹窗共用 */
export function ReceiptDetailFields({
  date,
  onDateChange,
  hour,
  onHourChange,
  minute,
  onMinuteChange,
  second,
  onSecondChange,
  price,
  onPriceChange,
  categoryKey,
  onCategoryKeyChange,
  customType,
  onCustomTypeChange,
  categories,
  description,
  onDescriptionChange,
}: ReceiptDetailFieldsProps) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">{t('addReceipt.date')}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">{t('addReceipt.time')}</label>
        <div className="flex gap-2">
          <select
            value={hour}
            onChange={(e) => onHourChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:border-brand focus:outline-none"
            aria-label={t('addReceipt.hour')}
          >
            <option value="">{t('addReceipt.timeEmpty')}</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <select
            value={minute}
            onChange={(e) => onMinuteChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:border-brand focus:outline-none"
            aria-label={t('addReceipt.minute')}
          >
            <option value="">{t('addReceipt.timeEmpty')}</option>
            {MIN_SEC_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={second}
            onChange={(e) => onSecondChange(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-2 text-sm text-zinc-200 focus:border-brand focus:outline-none"
            aria-label={t('addReceipt.second')}
          >
            <option value="">{t('addReceipt.timeEmpty')}</option>
            {MIN_SEC_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{t('addReceipt.timeHint')}</p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">{t('receipt.colAmount')}</label>
        <input
          type="text"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="150"
          className={inputClass}
          spellCheck={false}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">{t('receipt.colCategory')}</label>
        <select
          value={categoryKey}
          onChange={(e) => onCategoryKeyChange(e.target.value)}
          className={inputClass}
        >
          <option value="">{t('addReceipt.categoryPlaceholder')}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          <option value={CATEGORY_OTHER}>{t('addReceipt.categoryOther')}</option>
        </select>
        {categoryKey === CATEGORY_OTHER && (
          <input
            type="text"
            value={customType}
            onChange={(e) => onCustomTypeChange(e.target.value)}
            placeholder={t('addReceipt.categoryCustomPlaceholder')}
            className={`mt-2 ${inputClass}`}
            spellCheck={false}
          />
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">{t('receipt.colDescription')}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={inputClass}
          spellCheck={false}
        />
      </div>
    </>
  );
}
