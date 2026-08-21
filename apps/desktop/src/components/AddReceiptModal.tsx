import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { CanvasEditor, type CanvasEditorHandle } from '@canvas-studio/ui-react';
import type { ExportFormat } from '@canvas-studio/core';
import {
  buildReceiptFileName,
  getDefaultReceiptDate,
  resolveTimeRaw,
  toDateRaw,
} from '../lib/build-receipt-filename';
import { formatPrice, tryParseReceiptFileName } from '../lib/receipt-parser';
import { splitFileName } from '../lib/filename-utils';
import { dataUrlToBlobUrl } from '../lib/data-url-to-blob-url';
import { blobToDataUrl } from '../lib/blob-to-data-url';
import { CATEGORY_OTHER } from '../lib/receipt-form-options';
import { t } from '../i18n';
import { UiButton } from './ui';
import { OverwriteConfirmDialog } from './OverwriteConfirmDialog';
import { FilenameField } from './FilenameField';
import { ReceiptDetailFields } from './ReceiptDetailFields';

type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';
type SaveImageFormat = 'jpg' | 'png';

interface AddReceiptModalProps {
  dirPath: string;
  sourcePath: string;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function AddReceiptModal({
  dirPath,
  sourcePath: initialSourcePath,
  categories,
  onClose,
  onSaved,
}: AddReceiptModalProps) {
  const defaultDate = useMemo(() => getDefaultReceiptDate(dirPath), [dirPath]);

  const [sourcePath, setSourcePath] = useState(initialSourcePath);
  const sourceExt = useMemo(() => splitFileName(sourcePath.replace(/^.*[/\\]/, '')).ext, [sourcePath]);
  const editorRef = useRef<CanvasEditorHandle>(null);
  const [saveFormat, setSaveFormat] = useState<SaveImageFormat>('jpg');

  const [date, setDate] = useState(defaultDate);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [second, setSecond] = useState('');
  const [price, setPrice] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const [previewKind, setPreviewKind] = useState<PreviewKind | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      setTextContent(null);
      setImageDataUrl(null);
      setPdfBlobUrl(null);
      setPreviewKind(null);

      try {
        const info = await window.electronAPI.getPickedFilePreviewInfo(sourcePath);
        if (cancelled) return;
        const kind = info.kind as PreviewKind;
        setPreviewKind(kind);

        if (kind === 'text') {
          const res = await window.electronAPI.readPickedTextPreview(sourcePath);
          if (cancelled) return;
          if ('error' in res) throw new Error(res.error);
          setTextContent(res.content);
        } else if (kind === 'image') {
          const res = await window.electronAPI.readPickedFileDataUrl(sourcePath);
          if (cancelled) return;
          if ('error' in res) throw new Error(res.error);
          setImageDataUrl(res.dataUrl);
        } else if (kind === 'pdf') {
          const res = await window.electronAPI.readPickedFileDataUrl(sourcePath);
          if (cancelled) return;
          if ('error' in res) throw new Error(res.error);
          blobUrl = dataUrlToBlobUrl(res.dataUrl);
          setPdfBlobUrl(blobUrl);
        }
      } catch (e) {
        if (!cancelled) setPreviewError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [sourcePath]);

  const resolvedType =
    categoryKey === CATEGORY_OTHER ? customType.trim() : categoryKey.trim();

  // Images are re-encoded through the editor at the chosen save format, so the
  // saved extension follows that choice rather than the original picked file's
  // extension; other file kinds are copied as-is and keep their own extension.
  const effectiveExt = useMemo(
    () => (previewKind === 'image' ? (saveFormat === 'jpg' ? '.jpg' : '.png') : sourceExt),
    [previewKind, saveFormat, sourceExt]
  );

  const isDirty = useMemo(
    () =>
      date !== defaultDate ||
      hour !== '' ||
      minute !== '' ||
      second !== '' ||
      price.trim() !== '' ||
      categoryKey !== '' ||
      customType.trim() !== '' ||
      description.trim() !== '',
    [date, hour, minute, second, price, categoryKey, customType, description, defaultDate]
  );

  const previewFileName = useMemo(() => {
    try {
      const dateRaw = toDateRaw(date);
      const timeRaw = resolveTimeRaw(hour, minute, second);
      const trimmedType = resolvedType;
      const trimmedPrice = price.trim();
      if (!trimmedType || !trimmedPrice) return '';
      formatPrice(trimmedPrice);
      return buildReceiptFileName({
        dateRaw,
        timeRaw,
        price: trimmedPrice,
        type: trimmedType,
        description,
        ext: effectiveExt,
      });
    } catch {
      return '';
    }
  }, [date, hour, minute, second, price, resolvedType, description, effectiveExt]);

  const performSave = useCallback(
    async (overwrite = false): Promise<boolean> => {
      const trimmedType = resolvedType;
      const trimmedPrice = price.trim();
      if (!trimmedType) {
        setError(t('addReceipt.typeRequired'));
        return false;
      }
      if (!trimmedPrice) {
        setError(t('addReceipt.priceRequired'));
        return false;
      }
      let dateRaw: string;
      try {
        dateRaw = toDateRaw(date);
      } catch {
        setError(t('addReceipt.dateInvalid'));
        return false;
      }
      try {
        formatPrice(trimmedPrice);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }

      const timeRaw = resolveTimeRaw(hour, minute, second);
      const fileName = buildReceiptFileName({
        dateRaw,
        timeRaw,
        price: trimmedPrice,
        type: trimmedType,
        description,
        ext: effectiveExt,
      });

      if (!tryParseReceiptFileName(fileName, '')) {
        setError(t('addReceipt.fileNameInvalid'));
        return false;
      }

      if (!overwrite) {
        const exists = await window.electronAPI.fileExistsInDir(dirPath, fileName);
        if (exists) {
          setShowOverwriteConfirm(true);
          return false;
        }
      }

      setSaving(true);
      setError(null);
      try {
        if (previewKind === 'image') {
          if (!editorRef.current) {
            setError(t('addReceipt.saveFailed'));
            return false;
          }
          const format: ExportFormat = saveFormat === 'jpg' ? 'jpeg' : 'png';
          const quality = saveFormat === 'jpg' ? 0.8 : undefined;
          const blob = await editorRef.current.exportBlob(format, { quality });
          if (!blob) {
            setError(t('addReceipt.saveFailed'));
            return false;
          }
          const dataUrl = await blobToDataUrl(blob);
          const res = await window.electronAPI.writeImage(dirPath, fileName, dataUrl, overwrite);
          if (res.ok) {
            onSaved();
            onClose();
            return true;
          }
          setError(res.error ?? t('addReceipt.saveFailed'));
          return false;
        }

        const res = await window.electronAPI.importReceiptFile(sourcePath, dirPath, fileName, overwrite);
        if (res.ok) {
          onSaved();
          onClose();
          return true;
        }
        setError(res.error ?? t('addReceipt.saveFailed'));
        return false;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      date,
      hour,
      minute,
      second,
      price,
      resolvedType,
      description,
      effectiveExt,
      previewKind,
      saveFormat,
      sourcePath,
      dirPath,
      onClose,
      onSaved,
    ]
  );

  const handleSave = useCallback(() => performSave(false), [performSave]);

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
    await performSave(false);
  }, [performSave]);

  const handleOverwriteConfirm = useCallback(async () => {
    setShowOverwriteConfirm(false);
    await performSave(true);
  }, [performSave]);

  const handleReselectFile = useCallback(async () => {
    const picked = await window.electronAPI.selectReceiptSourceFile();
    if (picked) setSourcePath(picked);
  }, []);

  const handleOpenExternal = useCallback(async () => {
    await window.electronAPI.openPickedPath(sourcePath);
  }, [sourcePath]);

  const showOpenExternal =
    previewKind === 'pdf' || previewKind === 'unsupported' || previewError !== null;

  const renderPreview = () => {
    if (previewLoading) {
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
    if (previewKind === 'image' && imageDataUrl) {
      return (
        <CanvasEditor
          key={sourcePath}
          ref={editorRef}
          initialImage={imageDataUrl}
          showSaveProject={false}
          showExport={false}
          className="h-full w-full"
        />
      );
    }
    if (previewKind === 'pdf' && pdfBlobUrl) {
      return <embed src={pdfBlobUrl} type="application/pdf" className="h-full w-full bg-white" />;
    }
    if (previewKind === 'text' && textContent !== null) {
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

  const pdfReady = previewKind === 'pdf' && pdfBlobUrl && !previewError && !previewLoading;
  const imageEditorReady =
    previewKind === 'image' && !!imageDataUrl && !previewError && !previewLoading;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-900" role="dialog" aria-modal="true">
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

      {showOverwriteConfirm && previewFileName && (
        <OverwriteConfirmDialog
          fileName={previewFileName}
          saving={saving}
          onConfirm={handleOverwriteConfirm}
          onCancel={() => setShowOverwriteConfirm(false)}
        />
      )}

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-700 px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
          {t('addReceipt.title')}
        </span>
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-4">
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500" title={sourcePath}>
              {sourcePath}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {showOpenExternal && (
                <UiButton variant="outline" size="sm" onClick={handleOpenExternal}>
                  {t('preview.openExternal')}
                </UiButton>
              )}
              <UiButton variant="outline" size="sm" onClick={handleReselectFile} disabled={saving}>
                {t('addReceipt.reselectFile')}
              </UiButton>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950/80">
            {pdfReady || imageEditorReady ? (
              <div className="absolute inset-0">{renderPreview()}</div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
                {renderPreview()}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-zinc-700">
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
            <ReceiptDetailFields
              date={date}
              onDateChange={setDate}
              hour={hour}
              onHourChange={setHour}
              minute={minute}
              onMinuteChange={setMinute}
              second={second}
              onSecondChange={setSecond}
              price={price}
              onPriceChange={setPrice}
              categoryKey={categoryKey}
              onCategoryKeyChange={setCategoryKey}
              customType={customType}
              onCustomTypeChange={setCustomType}
              categories={categories}
              description={description}
              onDescriptionChange={setDescription}
            />

            {previewKind === 'image' && (
              <div>
                <label className="mb-1 block text-xs text-zinc-400">{t('addReceipt.saveFormat')}</label>
                <select
                  value={saveFormat}
                  onChange={(e) => setSaveFormat(e.target.value as SaveImageFormat)}
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/50"
                >
                  <option value="jpg">JPG ({t('addReceipt.saveFormatJpgQuality')})</option>
                  <option value="png">PNG</option>
                </select>
              </div>
            )}

            <FilenameField value={previewFileName} />

            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-700 p-4">
            <UiButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? t('preview.saving') : t('preview.save')}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  );
}
