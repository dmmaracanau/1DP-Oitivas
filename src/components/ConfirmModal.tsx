import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 no-print"
    >
      <div 
        role="dialog"
        aria-modal="true"
        className={`border-2 rounded-3xl w-[95vw] max-w-md overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150 transition-colors ${
          isDark
            ? 'bg-[#151025] border-rose-500/60 shadow-rose-950/80 text-white'
            : 'bg-white border-rose-300 shadow-xl text-slate-900'
        }`}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-lg ${
            isDestructive 
              ? (isDark ? 'bg-rose-950/80 border-rose-500/70 text-rose-400' : 'bg-rose-100 border-rose-300 text-rose-700')
              : (isDark ? 'bg-amber-950/80 border-amber-500/70 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-700')
          }`}>
            {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </h3>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
              isDark
                ? 'text-zinc-300 hover:text-white hover:bg-purple-950/60 border-purple-900/40'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center justify-end gap-2.5 pt-2 border-t-2 ${isDark ? 'border-purple-900/40' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-[#201838] hover:bg-purple-950/80 text-zinc-200 hover:text-white border-purple-700/50 hover:border-purple-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 border-2 ${
              isDestructive
                ? (isDark
                    ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white shadow-rose-950/50 border-rose-400'
                    : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-400 shadow-sm font-black')
                : (isDark
                    ? 'bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white shadow-purple-950/50 border-amber-400'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-400 shadow-sm font-black')
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
