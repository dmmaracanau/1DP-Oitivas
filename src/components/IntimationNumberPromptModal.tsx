import React, { useState, useEffect } from 'react';
import { X, FileText, Check, ArrowRight, Hash, Calendar } from 'lucide-react';
import { formatIntimationNumberDisplay } from '../utils/formatters';

interface IntimationNumberPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (intimationNumber: string, attemptNumber: number) => void;
  initialNumber?: string;
  initialAttempt?: number;
  actionTitle?: string;
  actionIcon?: React.ReactNode;
}

export const IntimationNumberPromptModal: React.FC<IntimationNumberPromptModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialNumber,
  initialAttempt = 1,
  actionTitle = 'Confirmar e Baixar PDF',
  actionIcon
}) => {
  const currentYear = new Date().getFullYear();
  const [numberVal, setNumberVal] = useState('');
  const [attemptVal, setAttemptVal] = useState<number>(1);

  useEffect(() => {
    if (isOpen) {
      const defaultNum = initialNumber && initialNumber.trim() 
        ? formatIntimationNumberDisplay(initialNumber) 
        : `01/${currentYear}`;
      setNumberVal(defaultNum);
      setAttemptVal(initialAttempt || 1);
    }
  }, [isOpen, initialNumber, initialAttempt, currentYear]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow clean typing of XX/XXXX
    setNumberVal(raw);
  };

  const handleQuickSuggest = (numStr: string) => {
    setNumberVal(`${numStr.padStart(2, '0')}/${currentYear}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNumber = formatIntimationNumberDisplay(numberVal);
    onConfirm(finalNumber, attemptVal);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#151124] border-2 border-purple-800/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-950/90 text-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#1a142c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/40 flex items-center justify-center text-purple-200 shadow-md">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Número da Intimação
              </h3>
              <p className="text-xs text-zinc-400">
                Padrão Oficial NN/AAAA (ex: 01/{currentYear})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
              <span>Informe o Número da Intimação (NN/AAAA):</span>
              <span className="text-[10px] text-purple-300 font-mono">INTIMAÇÃO XX/XXXX</span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={numberVal}
                onChange={handleInputChange}
                placeholder={`01/${currentYear}`}
                className="w-full bg-[#0e0a19] border-2 border-purple-800/60 focus:border-purple-400 rounded-2xl px-4 py-3 text-white font-mono text-base font-bold tracking-wider placeholder:text-zinc-600 focus:outline-none transition-colors"
                required
              />
            </div>
            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-zinc-400">
              <span className="text-zinc-500">Sugestões:</span>
              {['1', '2', '3', '4', '5'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleQuickSuggest(n)}
                  className="px-2 py-0.5 rounded-lg bg-purple-950/60 hover:bg-purple-900 border border-purple-700/50 text-purple-300 font-mono transition-colors"
                >
                  {n.padStart(2, '0')}/{currentYear}
                </button>
              ))}
            </div>
          </div>

          {/* Attempt Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Tentativa de Intimação:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setAttemptVal(num)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${
                    attemptVal === num
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-950'
                      : 'bg-[#0e0a19] border-purple-950 text-zinc-400 hover:text-white hover:border-purple-800'
                  }`}
                >
                  {num}ª Tentativa
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Texto no documento: <strong className="text-purple-300 font-mono">{attemptVal}ª TENTATIVA DE INTIMAÇÃO</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border-2 border-purple-900/60 bg-[#161226] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-950/80 border-2 border-purple-400/50 transition-all cursor-pointer"
            >
              {actionIcon || <Check className="w-4 h-4" />}
              <span>{actionTitle}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
