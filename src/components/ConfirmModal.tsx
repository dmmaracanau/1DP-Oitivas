import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = true,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-[#151025] border-2 border-rose-500/60 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-rose-950/80 p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150"
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-lg ${
            isDestructive 
              ? 'bg-rose-950/80 border-rose-500/70 text-rose-400' 
              : 'bg-amber-950/80 border-amber-500/70 text-amber-400'
          }`}>
            {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border border-purple-900/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-purple-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-[#201838] hover:bg-purple-950/80 text-zinc-200 hover:text-white rounded-xl text-xs font-bold border-2 border-purple-700/50 hover:border-purple-500 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            id="confirm-modal-action-btn"
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              isDestructive
                ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 shadow-rose-950/50 border-2 border-rose-400'
                : 'bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 shadow-purple-950/50 border-2 border-amber-400'
            }`}
          >
            {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Processando...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
