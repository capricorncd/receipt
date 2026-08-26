import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PenSquare, X } from 'lucide-react';
import { localFileUrl } from '../lib/local-file-url';
import { dataUrlToBlobUrl } from '../lib/data-url-to-blob-url';
import { getParentDir, splitFileName } from '../lib/filename-utils';
import {
  buildReceiptFileName,
  fromDateRaw,
  getDefaultReceiptDate,
  resolveTimeRaw,
  toDateRaw,
} from '../lib/build-receipt-filename';
import { formatPrice, tryParseReceiptFileName } from '../lib/receipt-parser';
import { CATEGORY_OTHER } from '../lib/receipt-form-options';
import { t } from '../i18n';
import { ImageEditorModal } from './ImageEditorModal';
import { OverwriteConfirmDialog } from './OverwriteConfirmDialog';
import { FilenameField } from './FilenameField';
import { ReceiptDetailFields } from './ReceiptDetailFields';
import { UiButton } from './ui';

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

interface FilePreviewModalProps {
  filePath: string;
  fileName: string;
  categories: string[];
  onClose: () => void;
  onRenamed: () => void;
}

interface DetailFieldsState {
  date: string;
  hour: string;
  minute: string;
  second: string;
  price: string;
  categoryKey: string;
  customType: string;
  description: string;
}

export function FilePreviewModal({
  filePath,
  fileName,
  categories,
  onClose,
  onRenamed,
}: FilePreviewModalProps) {
  const fileExt = useMemo(() => splitFileName(fileName).ext, [fileName]);
  const dirPath = useMemo(() => getParentDir(filePath), [filePath]);

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
  const [showImageEditor, setShowImageEditor] = useState(false);

  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [second, setSecond] = useState('');
  const [price, setPrice] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const initialFieldsRef = useRef<DetailFieldsState | null>(null);

  // Populate the fields from the existing receipt filename when possible, falling
  // back to add-receipt-like defaults (today's date, noon, blank rest) otherwise.
  useEffect(() => {
    const parsed = tryParseReceiptFileName(fileName, filePath);
    let next: DetailFieldsState;
    if (parsed) {
      // Always reflect the file's actual saved time here, even when it's exactly
      // 12:00:00 — this is an edit of existing data, not a fresh "unset" default.
      const t6 = parsed.timeRaw.padStart(6, '0');
      next = {
        date: fromDateRaw(parsed.dateRaw),
        hour: t6.slice(0, 2),
        minute: t6.slice(2, 4),
        second: t6.slice(4, 6),
        price: parsed.priceRaw,
        categoryKey: categories.includes(parsed.type) ? parsed.type : CATEGORY_OTHER,
        customType: categories.includes(parsed.type) ? '' : parsed.type,
        description: parsed.description,
      };
    } else {
      // Unparseable filename (shown under "其他文件"): can't recover structured fields
      // from it, so at least carry the original name into description instead of
      // discarding it — the user would otherwise lose their only clue to what it was.
      next = {
        date: getDefaultReceiptDate(dirPath),
        hour: '12',
        minute: '00',
        second: '00',
        price: '',
        categoryKey: '',
        customType: '',
        description: splitFileName(fileName).baseName,
      };
    }
    setDate(next.date);
    setHour(next.hour);
    setMinute(next.minute);
    setSecond(next.second);
    setPrice(next.price);
    setCategoryKey(next.categoryKey);
    setCustomType(next.customType);
    setDescription(next.description);
    initialFieldsRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, fileName]);

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

  const resolvedType = categoryKey === CATEGORY_OTHER ? customType.trim() : categoryKey.trim();

  const previewFileName = useMemo(() => {
    try {
      const dateRaw = toDateRaw(date);
      const timeRaw = resolveTimeRaw(hour, minute, second);
      const trimmedPrice = price.trim();
      if (!resolvedType || !trimmedPrice) return '';
      formatPrice(trimmedPrice);
      return buildReceiptFileName({
        dateRaw,
        timeRaw,
        price: trimmedPrice,
        type: resolvedType,
        description,
        ext: fileExt,
      });
    } catch {
      return '';
    }
  }, [date, hour, minute, second, price, resolvedType, description, fileExt]);

  const isDirty = useMemo(() => {
    const init = initialFieldsRef.current;
    if (!init) return false;
    return (
      date !== init.date ||
      hour !== init.hour ||
      minute !== init.minute ||
      second !== init.second ||
      price !== init.price ||
      categoryKey !== init.categoryKey ||
      customType !== init.customType ||
      description !== init.description
    );
  }, [date, hour, minute, second, price, categoryKey, customType, description]);

  const performSave = useCallback(
    async (overwrite = false): Promise<boolean> => {
      const trimmedPrice = price.trim();
      if (!resolvedType) {
        setSaveError(t('addReceipt.typeRequired'));
        return false;
      }
      if (!trimmedPrice) {
        setSaveError(t('addReceipt.priceRequired'));
        return false;
      }
      let dateRaw: string;
      try {
        dateRaw = toDateRaw(date);
      } catch {
        setSaveError(t('addReceipt.dateInvalid'));
        return false;
      }
      try {
        formatPrice(trimmedPrice);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : String(e));
        return false;
      }

      const timeRaw = resolveTimeRaw(hour, minute, second);
      const newFileName = buildReceiptFileName({
        dateRaw,
        timeRaw,
        price: trimmedPrice,
        type: resolvedType,
        description,
        ext: fileExt,
      });

      if (!tryParseReceiptFileName(newFileName, '')) {
        setSaveError(t('addReceipt.fileNameInvalid'));
        return false;
      }

      if (newFileName === fileName) {
        return true;
      }

      if (!overwrite) {
        const exists = await window.electronAPI.fileExistsInDir(dirPath, newFileName);
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
    [date, hour, minute, second, price, resolvedType, description, fileExt, fileName, filePath, dirPath, onClose, onRenamed]
  );

  const handleSave = useCallback(() => performSave(false), [performSave]);

  const handleOverwriteConfirm = useCallback(async () => {
    setShowOverwriteConfirm(false);
    await performSave(true);
  }, [performSave]);

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

  const handleOpenExternal = useCallback(async () => {
    await window.electronAPI.openPath(filePath);
  }, [filePath]);

  const showOpenExternal = kind === 'pdf' || kind === 'unsupported' || previewError !== null;

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
      return <embed src={pdfBlobUrl} type="application/pdf" className="h-full w-full bg-white" />;
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

      {showOverwriteConfirm && (
        <OverwriteConfirmDialog
          fileName={overwriteTargetName}
          saving={saving}
          onConfirm={handleOverwriteConfirm}
          onCancel={() => setShowOverwriteConfirm(false)}
        />
      )}

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-700 px-4">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
          {t('preview.title')}
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
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500" title={filePath}>
              {filePath}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {kind === 'image' && (
                <UiButton variant="secondary" size="sm" onClick={() => setShowImageEditor(true)}>
                  <PenSquare className="h-3.5 w-3.5" />
                  {t('preview.editImage')}
                </UiButton>
              )}
              {showOpenExternal && (
                <UiButton variant="outline" size="sm" onClick={handleOpenExternal}>
                  {t('preview.openExternal')}
                </UiButton>
              )}
            </div>
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

            <FilenameField value={previewFileName} />

            {previewError && (
              <p className="rounded-md bg-red-900/40 px-3 py-2 text-xs text-red-200">{previewError}</p>
            )}
            {saveError && <p className="text-xs text-red-300">{saveError}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-zinc-700 p-4">
            <UiButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? t('preview.saving') : t('preview.save')}
            </UiButton>
          </div>
        </div>
      </div>

      {showImageEditor && (
        <ImageEditorModal
          filePath={filePath}
          fileName={fileName}
          onClose={() => setShowImageEditor(false)}
          onSaved={() => {
            setShowImageEditor(false);
            onRenamed();
            onClose();
          }}
        />
      )}
    </div>
  );
}
