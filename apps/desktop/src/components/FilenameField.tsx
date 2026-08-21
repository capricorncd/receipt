import { t } from '../i18n';

interface FilenameFieldProps {
  value: string;
}

/** 只读展示最终文件名（各项填写后拼接的结果），用于新增/预览弹窗保持一致 */
export function FilenameField({ value }: FilenameFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{t('preview.filename')}</label>
      <input
        type="text"
        value={value}
        readOnly
        spellCheck={false}
        className="w-full cursor-not-allowed rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-2 font-mono text-sm text-zinc-400 focus:outline-none"
      />
    </div>
  );
}
