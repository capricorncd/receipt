import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { cn } from '../lib/cn';
import { t } from '../i18n';
import { UiButton } from './ui';

export type ExportProgressStatus = 'exporting' | 'success' | 'error' | 'cancelled';

interface ExportProgressModalProps {
  status: ExportProgressStatus;
  filePath?: string;
  errorMessage?: string;
  onClose: () => void;
}

export function ExportProgressModal({
  status,
  filePath,
  errorMessage,
  onClose,
}: ExportProgressModalProps) {
  const isExporting = status === 'exporting';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-600 bg-zinc-900 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          {status === 'exporting' && (
            <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand-light" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          )}
          {status === 'error' && (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          )}
          {status === 'cancelled' && (
            <X className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-200">
              {status === 'exporting' && t('export.progressExporting')}
              {status === 'success' && t('export.progressSuccess')}
              {status === 'error' && t('export.progressFailed')}
              {status === 'cancelled' && t('export.progressCancelled')}
            </p>
            {status === 'exporting' && (
              <p className="mt-1 text-xs text-zinc-500">{t('export.progressHint')}</p>
            )}
            {status === 'success' && filePath && (
              <div className="mt-2">
                <p className="mt-2 text-xs text-zinc-500">{t('export.progressFilePath')}</p>
                <p className="mt-1 break-all rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1.5 font-mono text-xs text-zinc-300">
                  {filePath}
                </p>
              </div>
            )}
            {status === 'error' && errorMessage && (
              <p className="mt-2 rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-200">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <UiButton
            variant={status === 'success' ? 'primary' : 'outline'}
            size="md"
            onClick={onClose}
            disabled={isExporting}
            className={cn(isExporting && 'opacity-50')}
          >
            {isExporting ? t('export.progressWorking') : t('export.progressClose')}
          </UiButton>
        </div>
      </div>
    </div>
  );
}
