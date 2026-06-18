import { t } from '../i18n';
import { UiButton } from './ui';

interface OverwriteConfirmDialogProps {
  fileName: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OverwriteConfirmDialog({
  fileName,
  saving = false,
  onConfirm,
  onCancel,
}: OverwriteConfirmDialogProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-zinc-600 bg-zinc-900 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-zinc-200">{t('file.overwriteTitle')}</p>
        <p className="mt-2 text-sm text-zinc-400">{t('file.overwriteMessage')}</p>
        <p className="mt-2 break-all rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1.5 font-mono text-xs text-zinc-300">
          {fileName}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <UiButton variant="outline" size="md" onClick={onCancel} disabled={saving}>
            {t('preview.cancel')}
          </UiButton>
          <UiButton variant="primary" size="md" onClick={onConfirm} disabled={saving}>
            {saving ? t('preview.saving') : t('file.overwriteConfirm')}
          </UiButton>
        </div>
      </div>
    </div>
  );
}
