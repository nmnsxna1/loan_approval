import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) return null;

  const colors = {
    danger: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', btn: 'bg-red-600 hover:bg-red-700' },
    warning: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', btn: 'bg-yellow-600 hover:bg-yellow-700' },
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', btn: 'bg-blue-600 hover:bg-blue-700' },
  };

  const c = colors[variant];

  const handleConfirm = () => {
    logger.info(`Confirm dialog confirmed: ${title}`, {
      file: 'src/components/ConfirmDialog.tsx', function: 'handleConfirm',
    });
    onConfirm();
  };

  const handleCancel = () => {
    logger.info(`Confirm dialog cancelled: ${title}`, {
      file: 'src/components/ConfirmDialog.tsx', function: 'handleCancel',
    });
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleCancel}>
      <div ref={ref} className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${c.bg} ${c.text}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${c.btn}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
