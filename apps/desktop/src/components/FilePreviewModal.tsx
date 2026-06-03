import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { localFileUrl } from '../lib/local-file-url';
import { t } from '../i18n';
import { UiButton } from './ui';

export type PreviewKind = 'image' | 'pdf' | 'text' | 'unsupported';

interface FilePreviewModalProps {
  filePath: string;
  fileName: string;
  onClose: () => void;
  onRenamed: () => void;
}

export function FilePreviewModal({ filePath, fileName, onClose, onRenamed }: FilePreviewModalProps) {
  const [editName, setEditName] = useState(fileName);
  const [kind, setKind] = useState<PreviewKind | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditName(fileName);
  }, [fileName, filePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setTextContent(null);
      setPdfDataUrl(null);
      setKind(null);
      try {
        const info = await window.electronAPI.getFilePreviewInfo(filePath);
        if (cancelled) return;
        setKind(info.kind as PreviewKind);

        if (info.kind === 'text') {
          const textRes = await window.electronAPI.readTextPreview(filePath);
          if (cancelled) return;
          if ('error' in textRes) throw new Error(textRes.error);
          setTextContent(textRes.content);
        } else if (info.kind === 'pdf') {
          const pdfRes = await window.electronAPI.readFileDataUrl(filePath);
          if (cancelled) return;
          if ('error' in pdfRes) throw new Error(pdfRes.error);
          setPdfDataUrl(pdfRes.dataUrl);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  const handleSave = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setError(t('preview.nameEmpty'));
      return;
    }
    if (trimmed === fileName) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await window.electronAPI.renameFile(filePath, trimmed);
      if (res.ok) {
        onRenamed();
        onClose();
      } else {
        setError(res.error ?? t('preview.saveFailed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [editName, fileName, filePath, onClose, onRenamed]);

  const handleOpenExternal = useCallback(async () => {
    await window.electronAPI.openPath(filePath);
  }, [filePath]);

  const renderPreview = () => {
    if (loading) {
      return <span className="text-sm text-zinc-500">{t('receipt.loading')}</span>;
    }
    if (error && kind !== 'image') {
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm text-red-300">{error}</span>
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
    if (kind === 'pdf' && pdfDataUrl) {
      return (
        <iframe
          src={pdfDataUrl}
          title={fileName}
          className="h-full w-full min-h-[400px] rounded border border-zinc-700 bg-white"
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] max-h-[900px] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 px-4 py-3">
          <span className="text-sm font-medium text-zinc-200">{t('preview.title')}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label={t('preview.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-zinc-950/80">
          <div className="absolute inset-0 flex items-stretch justify-center overflow-auto p-4">
            {renderPreview()}
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-zinc-700 p-4">
          <label className="block text-xs text-zinc-400">{t('preview.filename')}</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/50"
            spellCheck={false}
          />
          {error && kind === 'image' && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex justify-end gap-2">
            <UiButton variant="outline" size="md" onClick={onClose} disabled={saving}>
              {t('preview.cancel')}
            </UiButton>
            <UiButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
              {saving ? t('preview.saving') : t('preview.save')}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  );
}
