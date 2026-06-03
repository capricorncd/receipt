import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppStore } from '../stores/app-store';
import { classifyFolderFiles, formatDeclareRate, formatPeriod, formatUsageRatio } from '../lib/receipt-parser';
import { buildExportPayload } from '../lib/build-export-payload';
import { cn } from '../lib/cn';
import { t } from '../i18n';
import { FileEditButton } from './FileEditButton';
import { FilePreviewModal } from './FilePreviewModal';
import { UiButton } from './ui';

type MainTab = 'receipts' | 'other';

interface PreviewTarget {
  filePath: string;
  fileName: string;
}

export function ReceiptPanel() {
  const currentDir = useAppStore((s) => s.currentDir);
  const receipts = useAppStore((s) => s.receipts);
  const otherFiles = useAppStore((s) => s.otherFiles);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const setFolderData = useAppStore((s) => s.setFolderData);
  const clearFolderData = useAppStore((s) => s.clearFolderData);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);

  const [mainTab, setMainTab] = useState<MainTab>('receipts');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!currentDir || !window.electronAPI?.listFiles) return;
    setLoading(true);
    setError(null);
    try {
      const { entries } = await window.electronAPI.listFiles(currentDir);
      const { receipts: parsed, otherFiles: other } = classifyFolderFiles(entries);
      setFolderData(parsed, other);
      if (parsed.length === 0 && other.length > 0) {
        setMainTab('other');
      } else {
        setMainTab('receipts');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [currentDir, setFolderData, setLoading, setError]);

  useEffect(() => {
    if (!currentDir) return;
    setCategoryFilter('');
    loadFiles();
  }, [currentDir, loadFiles]);

  useEffect(() => {
    if (!currentDir || !window.electronAPI?.onDirChanged) return;
    const unsub = window.electronAPI.onDirChanged(() => {
      loadFiles();
    });
    return unsub;
  }, [currentDir, loadFiles]);

  const categories = useMemo(() => {
    const set = new Set(receipts.map((r) => r.type));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    if (!categoryFilter) return receipts;
    return receipts.filter((r) => r.type === categoryFilter);
  }, [receipts, categoryFilter]);

  const { totalAmount, totalDeclareAmount } = useMemo(
    () =>
      filteredReceipts.reduce(
        (acc, r) => ({
          totalAmount: acc.totalAmount + r.cost.amount,
          totalDeclareAmount: acc.totalDeclareAmount + r.cost.declareAmount,
        }),
        { totalAmount: 0, totalDeclareAmount: 0 }
      ),
    [filteredReceipts]
  );

  const dirName = currentDir ? currentDir.replace(/^.*[/\\]/, '') || currentDir : '';

  const handleRefresh = () => {
    if (!currentDir || loading) return;
    clearFolderData();
    loadFiles();
  };

  const buildExportLabels = useCallback(
    () => ({
      colDate: t('receipt.colDate'),
      colCategory: t('receipt.colCategory'),
      colAmount: t('receipt.colAmount'),
      colPeriod: t('receipt.colPeriod'),
      colUsageRatio: t('receipt.colUsageRatio'),
      colRatio: t('receipt.colDeclareRate'),
      colEffectiveAmount: t('receipt.colDeclareAmount'),
      colDescription: t('receipt.colDescription'),
      colFileName: t('receipt.exportFileName'),
      totalLabel: t('receipt.exportTotal'),
    }),
    []
  );

  const getExportPayload = useCallback(() => {
    if (!currentDir) return null;
    const base = dirName.replace(/[/\\?%*:|"<>]/g, '_');
    const baseName = categoryFilter ? `${base}-${categoryFilter}` : base;
    const title = categoryFilter ? `${dirName} · ${categoryFilter}` : dirName;
    return buildExportPayload(
      filteredReceipts,
      currentDir,
      baseName,
      title,
      buildExportLabels(),
      { totalAmount, totalEffective: totalDeclareAmount }
    );
  }, [
    currentDir,
    dirName,
    categoryFilter,
    filteredReceipts,
    buildExportLabels,
    totalAmount,
    totalDeclareAmount,
  ]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (filteredReceipts.length === 0) {
      setError(t('receipt.exportNoData'));
      return;
    }
    const payload = getExportPayload();
    if (!payload) return;
    setExporting(true);
    setError(null);
    try {
      const res =
        format === 'csv'
          ? await window.electronAPI.exportCsv(payload)
          : await window.electronAPI.exportPdf(payload);
      if (!res.ok && !res.cancelled) {
        setError(res.error ?? t('receipt.exportFailed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  if (!currentDir) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        {t('receipt.openFolderFirst')}
      </div>
    );
  }

  const openPreview = (filePath: string, fileName: string) => {
    setPreviewTarget({ filePath, fileName });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {previewTarget && (
        <FilePreviewModal
          filePath={previewTarget.filePath}
          fileName={previewTarget.fileName}
          onClose={() => setPreviewTarget(null)}
          onRenamed={loadFiles}
        />
      )}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-700 px-4">
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200" title={currentDir}>
          {dirName}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <UiButton
            variant="outline"
            size="sm"
            disabled={loading || exporting || filteredReceipts.length === 0}
            onClick={() => handleExport('pdf')}
          >
            {t('receipt.exportPdf')}
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            disabled={loading || exporting || filteredReceipts.length === 0}
            onClick={() => handleExport('csv')}
          >
            {t('receipt.exportCsv')}
          </UiButton>
        </div>
      </header>

      <div className="flex shrink-0 items-center justify-between border-b border-zinc-700 px-4 pt-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMainTab('receipts')}
            className={cn(
              'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
              mainTab === 'receipts'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t('receipt.tabReceipts')}
            {receipts.length > 0 && (
              <span className="ml-1.5 text-xs text-zinc-500">({receipts.length})</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('other')}
            className={cn(
              'rounded-t-md px-4 py-2 text-sm font-medium transition-colors',
              mainTab === 'other'
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t('receipt.tabOther')}
            {otherFiles.length > 0 && (
              <span className="ml-1.5 text-xs text-zinc-500">({otherFiles.length})</span>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || exporting}
          className="mb-1 flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
          title={t('receipt.refreshTitle')}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          {t('receipt.refresh')}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-900/40 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      {loading && receipts.length === 0 && otherFiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-zinc-500">{t('receipt.loading')}</div>
      ) : mainTab === 'receipts' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              {t('receipt.filterCategory')}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:border-brand focus:outline-none"
              >
                <option value="">{t('receipt.filterAll')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            {filteredReceipts.length > 0 && (
              <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span>
                  {t('receipt.totalAmount')}:{' '}
                  <span className="tabular-nums font-medium text-zinc-200">
                    {totalAmount.toLocaleString()}
                  </span>
                </span>
                <span>
                  {t('receipt.totalDeclareAmount')}:{' '}
                  <span className="tabular-nums font-medium text-brand-light">
                    {totalDeclareAmount.toLocaleString()}
                  </span>
                </span>
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {filteredReceipts.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                {receipts.length === 0 ? t('receipt.noReceipts') : t('receipt.noMatch')}
              </div>
            ) : (
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-900">
                  <tr className="border-b border-zinc-700 text-xs text-zinc-400">
                    <th className="px-4 py-2 font-medium">{t('receipt.colDate')}</th>
                    <th className="px-4 py-2 font-medium">{t('receipt.colCategory')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('receipt.colAmount')}</th>
                    <th className="px-4 py-2 font-medium">{t('receipt.colPeriod')}</th>
                    <th className="px-4 py-2 font-medium">{t('receipt.colUsageRatio')}</th>
                    <th className="px-4 py-2 font-medium">{t('receipt.colDeclareRate')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('receipt.colDeclareAmount')}</th>
                    <th className="px-4 py-2 font-medium">{t('receipt.colDescription')}</th>
                    <th className="w-12 px-2 py-2 font-medium">{t('receipt.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((row) => (
                    <tr
                      key={row.filePath}
                      className="border-b border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/50"
                      title={row.fileName}
                    >
                      <td className="whitespace-nowrap px-4 py-2">{row.date}</td>
                      <td className="px-4 py-2">{row.type}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.cost.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{formatPeriod(row.cost)}</td>
                      <td className="px-4 py-2">{formatUsageRatio(row.cost)}</td>
                      <td className="px-4 py-2">{formatDeclareRate(row.cost.declareRate)}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-medium text-brand-light">
                        {row.cost.declareAmount.toLocaleString()}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-2" title={row.description}>
                        {row.description || '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <FileEditButton
                          onClick={() => openPreview(row.filePath, row.fileName)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {otherFiles.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              {t('receipt.noOtherFiles')}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-700">
              {otherFiles.map((f) => (
                <li
                  key={f.filePath}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/50"
                  title={f.filePath}
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{f.fileName}</span>
                  <FileEditButton onClick={() => openPreview(f.filePath, f.fileName)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
