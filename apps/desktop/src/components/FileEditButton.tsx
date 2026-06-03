import { Pencil } from 'lucide-react';
import { t } from '../i18n';

interface FileEditButtonProps {
  onClick: () => void;
}

export function FileEditButton({ onClick }: FileEditButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-brand-light"
      title={t('preview.edit')}
      aria-label={t('preview.edit')}
    >
      <Pencil className="h-4 w-4" />
    </button>
  );
}
