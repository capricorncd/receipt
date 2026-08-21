import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { CanvasEditor } from '@canvas-studio/ui-react';
import type { CanvasStudioProjectFile, ExportFormat } from '@canvas-studio/core';
import { localFileUrl } from '../lib/local-file-url';
import { getParentDir, joinFileName, splitFileName } from '../lib/filename-utils';
import { blobToDataUrl } from '../lib/blob-to-data-url';
import { t } from '../i18n';
import { OverwriteConfirmDialog } from './OverwriteConfirmDialog';

interface ImageEditorModalProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
  onSaved: () => void;
}

function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Full-screen canvas-studio editor for an existing receipt image file, opened from FilePreviewModal. */
export function ImageEditorModal({ filePath, fileName, onClose, onSaved }: ImageEditorModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ dataUrl: string; targetFileName: string } | null>(null);

  const dirPath = getParentDir(filePath);
  const { baseName } = splitFileName(fileName);

  const performSave = useCallback(
    async (dataUrl: string, targetFileName: string, overwrite: boolean) => {
      setSaving(true);
      setError(null);
      try {
        const res = await window.electronAPI.writeImage(dirPath, targetFileName, dataUrl, overwrite);
        if (res.ok) {
          onSaved();
          return;
        }
        setError(res.error ?? t('preview.saveFailed'));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [dirPath, onSaved]
  );

  const handleExport = useCallback(
    async (blob: Blob, format: ExportFormat) => {
      const dataUrl = await blobToDataUrl(blob);
      const targetFileName = joinFileName(baseName, `.${format}`);

      if (targetFileName === fileName) {
        // Same name as the file being edited — this *is* a save, not a naming conflict.
        await performSave(dataUrl, targetFileName, true);
        return;
      }

      const exists = await window.electronAPI.fileExistsInDir(dirPath, targetFileName);
      if (exists) {
        setPendingSave({ dataUrl, targetFileName });
        setShowOverwriteConfirm(true);
        return;
      }
      await performSave(dataUrl, targetFileName, false);
    },
    [baseName, dirPath, fileName, performSave]
  );

  const handleOverwriteConfirm = useCallback(async () => {
    setShowOverwriteConfirm(false);
    if (!pendingSave) return;
    const { dataUrl, targetFileName } = pendingSave;
    setPendingSave(null);
    await performSave(dataUrl, targetFileName, true);
  }, [pendingSave, performSave]);

  const handleSaveProject = useCallback(
    (project: CanvasStudioProjectFile) => {
      downloadJson(project, joinFileName(baseName, '.canvasstudio.json'));
    },
    [baseName]
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-900" role="dialog" aria-modal="true">
      {showOverwriteConfirm && pendingSave && (
        <OverwriteConfirmDialog
          fileName={pendingSave.targetFileName}
          saving={saving}
          onConfirm={() => void handleOverwriteConfirm()}
          onCancel={() => {
            setShowOverwriteConfirm(false);
            setPendingSave(null);
          }}
        />
      )}

      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-700 px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
          {t('imageEditor.title')}: {fileName}
        </span>
        {saving && <span className="shrink-0 text-xs text-zinc-400">{t('preview.saving')}</span>}
        {error && <span className="shrink-0 text-xs text-red-300">{error}</span>}
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          aria-label={t('preview.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <CanvasEditor
          initialImage={localFileUrl(filePath)}
          onExport={(blob, format) => void handleExport(blob, format)}
          onSaveProject={handleSaveProject}
        />
      </div>
    </div>
  );
}
