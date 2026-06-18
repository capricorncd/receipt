import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { localFileUrl } from '../lib/local-file-url';
import { dataUrlToBlobUrl } from '../lib/data-url-to-blob-url';
import { joinFileName, splitFileName } from '../lib/filename-utils';
import { t } from '../i18n';
import { OverwriteConfirmDialog } from './OverwriteConfirmDialog';
import { UiButton } from './ui';

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

function getParentDir(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return i >= 0 ? filePath.slice(0, i) : filePath;
}

interface FilePreviewModalProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
  onRenamed: () => void;
}

export function FilePreviewModal({ filePath, fileName, onClose, onRenamed }: FilePreviewModalProps) {
  const fileExt = useMemo(() => splitFileName(fileName).ext, [fileName]);
  const originalBaseName = useMemo(() => splitFileName(fileName).baseName, [fileName]);
  const [editBaseName, setEditBaseName] = useState(() => splitFileName(fileName).baseName);
  const [kind, setKind] = useState<PreviewKind | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [overwriteTargetName, setOverwriteTargetName] = useState('');

  const isDirty = editBaseName.trim() !== originalBaseName;

  useEffect(() => {
    setEditBaseName(originalBaseName);
  }, [originalBaseName, filePath]);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      setLoading(true);
      setPreviewError(null);
      setTextContent(null);
      setPdfBlobUrl(null);
      setKind(null);

      try {
        const info = await window.electronAPI.getFilePreviewInfo(filePath);
        if (cancelled) return;
        const previewKind = info.kind as PreviewKind;
        setKind(previewKind);

        if (previewKind === 'text') {
          const textRes = await window.electronAPI.readTextPreview(filePath);
          if (cancelled) return;
          if ('error' in textRes) throw new Error(textRes.error);
          setTextContent(textRes.content);
        } else if (previewKind === 'pdf') {
          const pdfRes = await window.electronAPI.readFileDataUrl(filePath);
          if (cancelled) return;
          if ('error' in pdfRes) throw new Error(pdfRes.error);
          blobUrl = dataUrlToBlobUrl(pdfRes.dataUrl);
          setPdfBlobUrl(blobUrl);
        }
      } catch (e) {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [filePath]);

  const performRename = useCallback(
    async (overwrite = false): Promise<boolean> => {
      const trimmedBase = editBaseName.trim();
      if (!trimmedBase) {
        setSaveError(t('preview.nameEmpty'));
        return false;
      }
      const newFileName = joinFileName(trimmedBase, fileExt);
      if (newFileName === fileName) {
        return true;
      }

      if (!overwrite) {
        const dir = getParentDir(filePath);
        const exists = await window.electronAPI.fileExistsInDir(dir, newFileName);
        if (exists) {
          setOverwriteTargetName(newFileName);
          setShowOverwriteConfirm(true);
          return false;
        }
      }

      setSaving(true);
      setSaveError(null);
      try {
        const res = await window.electronAPI.renameFile(filePath, newFileName, overwrite);
        if (res.ok) {
          onRenamed();
          onClose();
          return true;
        }
        setSaveError(res.error ?? t('preview.saveFailed'));
        return false;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [editBaseName, fileExt, fileName, filePath, onClose, onRenamed]
  );

  const handleSave = useCallback(() => performRename(false), [performRename]);

  const handleOverwriteConfirm = useCallback(async () => {
    setShowOverwriteConfirm(false);
    await performRename(true);
  }, [performRename]);

  const handleAttemptClose = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    setShowCloseConfirm(true);
  }, [saving, isDirty, onClose]);

  const handleDiscardAndClose = useCallback(() => {
    setShowCloseConfirm(false);
    onClose();
  }, [onClose]);

  const handleSaveAndClose = useCallback(async () => {
    setShowCloseConfirm(false);
    await performRename(false);
  }, [performRename]);

  const handleOpenExternal = useCallback(async () => {
    await window.electronAPI.openPath(filePath);
  }, [filePath]);

  const showOpenExternal =
    kind === 'pdf' || kind === 'unsupported' || previewError !== null;

  const renderPreview = () => {
    if (loading) {
      return <span className="text-sm text-zinc-500">{t('receipt.loading')}</span>;
    }
    if (previewError) {
      return (
        <div className="flex flex-col items-center gap-3 text-center text-sm text-zinc-500">
          <p>{t('preview.previewFailed')}</p>
          <UiButton variant="outline" size="sm" onClick={handleOpenExternal}>
            {t('preview.openExternal')}
          </UiButton>
        </div>
      );
    }
    if (kind === 'image') {
      return (
        <img
          src={localFileUrl(filePath)}
          alt={fileName}
          className="max-h-full max-w-full object-contain"
        />
      );
    }
    if (kind === 'pdf' && pdfBlobUrl) {
      return (
        <embed
          src={pdfBlobUrl}
          type="application/pdf"
          className="h-full w-full bg-white"
        />
      );
    }
    if (kind === 'text' && textContent !== null) {
      return (
        <pre className="h-full w-full overflow-auto whitespace-pre-wrap break-words rounded border border-zinc-700 bg-zinc-800/80 p-3 font-mono text-xs leading-relaxed text-zinc-200">
          {textContent.length > 0 ? textContent : t('preview.emptyText')}
        </pre>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 text-center text-sm text-zinc-500">
        <p>{t('preview.unsupported')}</p>
        <UiButton variant="outline" size="sm" onClick={handleOpenExternal}>
          {t('preview.openExternal')}
        </UiButton>
      </div>
    );
  };

  const pdfReady = kind === 'pdf' && pdfBlobUrl && !previewError && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[85vh] max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-900 shadow-2xl">
        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
            <div
              className="w-full max-w-sm rounded-xl border border-zinc-600 bg-zinc-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-medium text-zinc-200">{t('addReceipt.unsavedTitle')}</p>
              <p className="mt-2 text-sm text-zinc-400">{t('addReceipt.unsavedMessage')}</p>
              <div className="mt-4 flex justify-end gap-2">
                <UiButton
                  variant="outline"
                  size="md"
                  onClick={() => setShowCloseConfirm(false)}
                  disabled={saving}
                >
                  {t('addReceipt.unsavedCancel')}
                </UiButton>
                <UiButton variant="outline" size="md" onClick={handleDiscardAndClose} disabled={saving}>
                  {t('addReceipt.unsavedDiscard')}
                </UiButton>
                <UiButton variant="primary" size="md" onClick={handleSaveAndClose} disabled={saving}>
                  {saving ? t('preview.saving') : t('addReceipt.unsavedSave')}
                </UiButton>
              </div>
            </div>
          </div>
        )}

        {showOverwriteConfirm && (
          <OverwriteConfirmDialog
            fileName={overwriteTargetName}
            saving={saving}
            onConfirm={handleOverwriteConfirm}
            onCancel={() => setShowOverwriteConfirm(false)}
          />
        )}

        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-700 px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
            {t('preview.title')}
          </span>
          {showOpenExternal && (
            <UiButton variant="outline" size="sm" onClick={handleOpenExternal}>
              {t('preview.openExternal')}
            </UiButton>
          )}
          <button
            type="button"
            onClick={handleAttemptClose}
            disabled={saving}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label={t('preview.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950/80">
          {pdfReady ? (
            <div className="absolute inset-0">{renderPreview()}</div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
              {renderPreview()}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-700 p-4">
          <label className="block text-xs text-zinc-400">{t('preview.filename')}</label>
          <input
            type="text"
            value={editBaseName}
            onChange={(e) => setEditBaseName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/50"
            spellCheck={false}
          />
          {previewError && (
            <p className="rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-200">{previewError}</p>
          )}
          {saveError && <p className="text-xs text-red-300">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <UiButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? t('preview.saving') : t('preview.save')}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  );
}
