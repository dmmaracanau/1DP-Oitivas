import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Settings, 
  Info,
  ExternalLink
} from 'lucide-react';
import { CalendarSpecialDate } from '../types/oitiva';
import { formatDateBR } from '../utils/formatters';

interface HolidayTooltipProps {
  specialDate: CalendarSpecialDate;
  dateStr?: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  onOpenHolidaysModal?: (dateStr?: string) => void;
  disabled?: boolean;
}

export const HolidayTooltip: React.FC<HolidayTooltipProps> = ({
  specialDate,
  dateStr,
  children,
  isAdmin = false,
  onOpenHolidaysModal,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; placement: 'top' | 'bottom' }>({
    left: 0,
    placement: 'bottom'
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<any>(null);
  const leaveTimerRef = useRef<any>(null);

  const TOOLTIP_WIDTH = 340;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    if (left < 14) left = 14;
    if (left + TOOLTIP_WIDTH > windowW - 14) left = windowW - TOOLTIP_WIDTH - 14;

    const spaceBelow = windowH - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 260;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setCoords({
        bottom: windowH - rect.top + 8,
        left,
        placement: 'top'
      });
    } else {
      setCoords({
        top: rect.bottom + 8,
        left,
        placement: 'bottom'
      });
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    enterTimerRef.current = setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 140);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 140);
  };

  const handleTooltipMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 120);
  };

  // Close on scroll or ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrKey = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrKey, { passive: true, capture: true });
    window.addEventListener('keydown', handleScrollOrKey);

    return () => {
      window.removeEventListener('scroll', handleScrollOrKey, { capture: true });
      window.removeEventListener('keydown', handleScrollOrKey);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Description fallback if not provided
  const getDetailedDescription = () => {
    if (specialDate.description && specialDate.description.trim()) {
      return specialDate.description;
    }

    if (specialDate.type === 'fim_de_semana') {
      return 'Fim de semana (dia não útil). Período reservado para plantão policial ou escalas extraordinárias, sem expediente cartorário ordinário.';
    }

    if (specialDate.type === 'ponto_facultativo') {
      return 'Ponto facultativo decretado pelo Poder Executivo. As atividades regulares podem sofrer alterações conforme portaria oficial da Polícia Civil.';
    }

    return 'Feriado oficial aplicável a todas as unidades policiais e cartórios, sem agendamento regular de oitivas e audiências.';
  };

  const getTypeBadgeLabel = () => {
    switch (specialDate.type) {
      case 'fim_de_semana':
        return 'Fim de Semana';
      case 'ponto_facultativo':
        return 'Ponto Facultativo';
      case 'feriado':
      default:
        return 'Feriado Oficial';
    }
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block w-full"
    >
      {children}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'fixed',
            left: `${coords.left}px`,
            ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
            ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            width: `${TOOLTIP_WIDTH}px`,
            zIndex: 99999
          }}
          className="animate-in fade-in zoom-in-95 duration-150 ease-out select-none"
        >
          {/* Tooltip Card */}
          <div className="bg-[#180810] border-2 border-red-500/90 rounded-2xl p-4 shadow-2xl shadow-red-950/90 text-white backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header: Type and Date */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-red-700/60">
              <div className="flex items-center gap-1.5 text-xs font-black text-red-300 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>{getTypeBadgeLabel()}</span>
              </div>

              <div className="flex items-center gap-1">
                {specialDate.isRecurringAnnual !== false && !specialDate.isRecurringWeekend && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                    Anual
                  </span>
                )}
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-950 text-red-200 border border-red-500/60 uppercase tracking-wider">
                  {specialDate.isRecurringWeekend 
                    ? 'Recorrente' 
                    : (dateStr ? formatDateBR(dateStr) : (specialDate.date ? formatDateBR(specialDate.date) : 'Data Especial'))
                  }
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="mb-2">
              <h4 className="text-sm font-black text-white tracking-tight leading-snug">
                {specialDate.title}
              </h4>
            </div>

            {/* Detailed Description */}
            <div className="bg-[#240c16] p-2.5 rounded-xl border border-red-700/50 mb-3 text-[11px] leading-relaxed text-red-100/90">
              <p>{getDetailedDescription()}</p>
            </div>

            {/* Notification Alert / Guideline */}
            <div className="flex items-start gap-2 text-[10px] text-zinc-300 bg-black/40 p-2 rounded-lg border border-red-900/50 mb-2.5">
              <Info className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>
                Feriados e fins de semana são aplicados para todos os usuários para sinalizar ausência de expediente ordinário.
              </span>
            </div>

            {/* Footer / Admin Shortcut */}
            {isAdmin && onOpenHolidaysModal && (
              <div className="pt-2 border-t border-red-700/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-red-300">
                  Acesso de Administrador
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onOpenHolidaysModal(dateStr || specialDate.date);
                  }}
                  className="flex items-center gap-1 text-[11px] font-black text-white bg-red-900 hover:bg-red-800 border border-red-400/80 px-2.5 py-1 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  <Settings className="w-3 h-3 text-red-300" />
                  <span>Gerenciar Feriados</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
