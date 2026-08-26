import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, MoreVertical } from 'lucide-react';
import { t } from '../i18n';

interface FileActionsMenuProps {
  filePath: string;
  onCopied: () => void;
}

/** 文件行右侧的“更多操作”菜单（目前仅提供复制），点击外部或再次点击按钮即关闭 */
export function FileActionsMenu({ filePath, onCopied }: FileActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      return;
    }
    // Rendered in a portal so the menu can't be clipped by the table's scroll container.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(true);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    const res = await window.electronAPI.copyFile(filePath);
    if (res.ok) {
      onCopied();
    } else {
      window.alert(res.error ?? t('preview.saveFailed'));
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-brand-light"
        title={t('fileActions.more')}
        aria-label={t('fileActions.more')}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
            className="z-50 w-32 rounded-lg border border-zinc-600 bg-zinc-800 py-1 shadow-xl"
          >
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-700"
            >
              <Copy className="h-3.5 w-3.5" />
              {t('fileActions.copy')}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
