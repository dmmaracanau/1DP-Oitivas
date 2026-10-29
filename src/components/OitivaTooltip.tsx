import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  Phone, 
  FileText, 
  MapPin, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  XCircle, 
  CalendarDays,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Check
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { formatDateBR, formatPhone, getRoleBadgeClasses } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

interface OitivaTooltipProps {
  oitiva: Oitiva;
  children: React.ReactNode;
  onSelectOitiva?: (oitiva: Oitiva) => void;
  onQuickStatusChange?: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextSent: boolean) => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  disabled?: boolean;
}

const STATUS_LIST: { 
  status: HearingStatus; 
  label: string; 
  activeBg: string; 
  activeBorder: string; 
  hoverBg: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { 
    status: 'Agendada', 
    label: 'Agendada', 
    activeBg: 'bg-purple-600 text-white', 
    activeBorder: 'border-purple-300', 
    hoverBg: 'hover:bg-purple-950/80 hover:text-purple-200 hover:border-purple-500',
    badgeBg: 'bg-purple-950 text-purple-200 border-purple-500/70',
    icon: CalendarDays 
  },
  { 
    status: 'Realizada', 
    label: 'Realizada', 
    activeBg: 'bg-emerald-600 text-white', 
    activeBorder: 'border-emerald-300', 
    hoverBg: 'hover:bg-emerald-950/80 hover:text-emerald-200 hover:border-emerald-500',
    badgeBg: 'bg-emerald-950 text-emerald-200 border-emerald-500/70',
    icon: CheckCircle2 
  },
  { 
    status: 'Remarcada', 
    label: 'Remarcada', 
    activeBg: 'bg-amber-600 text-white', 
    activeBorder: 'border-amber-300', 
    hoverBg: 'hover:bg-amber-950/80 hover:text-amber-200 hover:border-amber-500',
    badgeBg: 'bg-amber-950 text-amber-200 border-amber-500/70',
    icon: RotateCcw 
  },
  { 
    status: 'Não Compareceu', 
    label: 'Não Compareceu', 
    activeBg: 'bg-orange-600 text-white', 
    activeBorder: 'border-orange-300', 
    hoverBg: 'hover:bg-orange-950/80 hover:text-orange-200 hover:border-orange-500',
    badgeBg: 'bg-orange-950 text-orange-200 border-orange-500/70',
    icon: AlertCircle 
  },
  { 
    status: 'Cancelada', 
    label: 'Cancelada', 
    activeBg: 'bg-rose-600 text-white', 
    activeBorder: 'border-rose-300', 
    hoverBg: 'hover:bg-rose-950/80 hover:text-rose-200 hover:border-rose-500',
    badgeBg: 'bg-rose-950 text-rose-200 border-rose-500/70',
    icon: XCircle 
  }
];

// Global timestamp to support warm hover transitions (instant preview when hovering across cards)
let globalLastTooltipCloseTime = 0;

type Placement = 'right' | 'left' | 'bottom' | 'top';

interface TooltipCoords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  placement: Placement;
  arrowOffset?: number;
}

export const OitivaTooltip: React.FC<OitivaTooltipProps> = ({
  oitiva,
  children,
  onSelectOitiva,
  onQuickStatusChange,
  onToggleIntimationSent,
  onOpenWhatsApp,
  disabled = false
}) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({
    placement: 'right'
  });
  const [statusChanging, setStatusChanging] = useState<HearingStatus | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<any>(null);
  const leaveTimerRef = useRef<any>(null);

  const TOOLTIP_WIDTH = 340;
  const ESTIMATED_HEIGHT = 370;

  const calculateSmartPosition = (): TooltipCoords => {
    if (!triggerRef.current) return { placement: 'bottom', left: 14, top: 100 };
    const rect = triggerRef.current.getBoundingClientRect();
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    const spaceRight = windowW - rect.right;
    const spaceLeft = rect.left;
    const spaceBelow = windowH - rect.bottom;
    const spaceAbove = rect.top;

    // Prioridade 1: Posicionar à DIREITA se houver espaço (não obstrui navegação vertical de oitivas no calendário)
    if (spaceRight >= TOOLTIP_WIDTH + 14) {
      const topPos = Math.max(12, Math.min(rect.top + (rect.height / 2) - 100, windowH - ESTIMATED_HEIGHT - 16));
      return {
        placement: 'right',
        left: rect.right + 10,
        top: topPos,
        arrowOffset: Math.max(20, Math.min(rect.top + (rect.height / 2) - topPos, ESTIMATED_HEIGHT - 30))
      };
    }

    // Prioridade 2: Posicionar à ESQUERDA se houver espaço (para colunas no lado direito do calendário)
    if (spaceLeft >= TOOLTIP_WIDTH + 14) {
      const topPos = Math.max(12, Math.min(rect.top + (rect.height / 2) - 100, windowH - ESTIMATED_HEIGHT - 16));
      return {
        placement: 'left',
        left: rect.left - TOOLTIP_WIDTH - 10,
        top: topPos,
        arrowOffset: Math.max(20, Math.min(rect.top + (rect.height / 2) - topPos, ESTIMATED_HEIGHT - 30))
      };
    }

    // Prioridade 3: Se as laterais forem estreitas (telas pequenas ou visão diária cheia), posicionar ABAIXO ou ACIMA
    if (spaceBelow >= ESTIMATED_HEIGHT + 14 || spaceBelow >= spaceAbove) {
      let left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
      if (left < 14) left = 14;
      if (left + TOOLTIP_WIDTH > windowW - 14) left = windowW - TOOLTIP_WIDTH - 14;

      return {
        placement: 'bottom',
        top: rect.bottom + 8,
        left,
        arrowOffset: Math.max(20, Math.min(rect.left + (rect.width / 2) - left, TOOLTIP_WIDTH - 20))
      };
    } else {
      let left = rect.left + (rect.width / 2) - (TOOLTIP_WIDTH / 2);
      if (left < 14) left = 14;
      if (left + TOOLTIP_WIDTH > windowW - 14) left = windowW - TOOLTIP_WIDTH - 14;

      return {
        placement: 'top',
        bottom: windowH - rect.top + 8,
        left,
        arrowOffset: Math.max(20, Math.min(rect.left + (rect.width / 2) - left, TOOLTIP_WIDTH - 20))
      };
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    // Warm hover: se o usuário já estava navegando em outro tooltip há menos de 350ms, abre quase instantaneamente (20ms)
    const isWarmHover = Date.now() - globalLastTooltipCloseTime < 350;
    const delay = isWarmHover ? 20 : 140;

    enterTimerRef.current = setTimeout(() => {
      const pos = calculateSmartPosition();
      setCoords(pos);
      setIsOpen(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      globalLastTooltipCloseTime = Date.now();
    }, 140); // 140ms é ágil o suficiente para não travar a tela e dar tempo de transitar para a tooltip
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
      globalLastTooltipCloseTime = Date.now();
    }, 120);
  };

  // Fechar ao rolar ou apertar ESC para nunca obstruir o operador
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrKey = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      setIsOpen(false);
      globalLastTooltipCloseTime = Date.now();
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

  const handleQuickStatus = (e: React.MouseEvent, targetStatus: HearingStatus) => {
    e.stopPropagation();
    e.preventDefault();
    if (targetStatus === oitiva.status) return;

    setStatusChanging(targetStatus);
    if (onQuickStatusChange) {
      onQuickStatusChange(oitiva.id, targetStatus);
    }
    setTimeout(() => {
      setStatusChanging(null);
    }, 1000);
  };

  // Status atual estilizado
  const currentStatusConfig = STATUS_LIST.find(s => s.status === oitiva.status) || STATUS_LIST[0];
  const CurrentIcon = currentStatusConfig.icon;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block w-full relative"
    >
      {children}

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'fixed',
            left: coords.left !== undefined ? `${coords.left}px` : undefined,
            right: coords.right !== undefined ? `${coords.right}px` : undefined,
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            width: `${TOOLTIP_WIDTH}px`,
            zIndex: 99999
          }}
          className="animate-in fade-in zoom-in-95 duration-100 ease-out select-none pointer-events-auto"
        >
          {/* Hover Bridge (Invisível para permitir trânsito fluido do mouse entre card e tooltip sem fechar) */}
          {coords.placement === 'right' && (
            <div className="absolute -left-3 top-0 bottom-0 w-3.5 pointer-events-auto bg-transparent" />
          )}
          {coords.placement === 'left' && (
            <div className="absolute -right-3 top-0 bottom-0 w-3.5 pointer-events-auto bg-transparent" />
          )}
          {coords.placement === 'bottom' && (
            <div className="absolute -top-3 left-0 right-0 h-3.5 pointer-events-auto bg-transparent" />
          )}
          {coords.placement === 'top' && (
            <div className="absolute -bottom-3 left-0 right-0 h-3.5 pointer-events-auto bg-transparent" />
          )}

          {/* Tooltip Content Container */}
          <div className={`border-2 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl relative overflow-hidden ${
            isDark 
              ? 'bg-[#120a24] border-purple-500/90 text-white shadow-purple-950/90 ring-1 ring-white/15' 
              : 'bg-white border-purple-300 text-slate-900 shadow-slate-300/80 ring-1 ring-slate-200'
          }`}>
            
            {/* Background subtle glow */}
            <div className={`absolute -top-16 -right-16 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              isDark ? 'bg-purple-600/20' : 'bg-purple-200/40'
            }`} />
            <div className={`absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
              isDark ? 'bg-indigo-600/15' : 'bg-indigo-100/40'
            }`} />

            {/* Top Bar: Data, Horário & Condição */}
            <div className={`flex items-center justify-between gap-2 pb-2 mb-2 border-b ${
              isDark ? 'border-purple-700/50' : 'border-purple-100'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 font-mono font-black text-xs px-2 py-0.5 rounded-lg border shadow-sm ${
                  isDark
                    ? 'bg-black/85 text-amber-300 border-amber-400/80'
                    : 'bg-amber-100 text-amber-950 border-amber-300'
                }`}>
                  <Clock className={`w-3 h-3 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                  <span>{oitiva.time || '--:--'}</span>
                </span>
                <span className={`font-bold text-xs ${isDark ? 'text-purple-200' : 'text-slate-800'}`}>
                  {formatDateBR(oitiva.date)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {oitiva.role && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${getRoleBadgeClasses(oitiva.role)}`}>
                    {oitiva.role}
                  </span>
                )}
                {oitiva.modality && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isDark 
                      ? 'bg-purple-950/80 text-cyan-300 border-cyan-500/40' 
                      : 'bg-cyan-50 text-cyan-950 border-cyan-300'
                  }`}>
                    {oitiva.modality}
                  </span>
                )}
              </div>
            </div>

            {/* Person Name (Full Name) */}
            <div className="mb-2">
              <p className={`text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 ${
                isDark ? 'text-purple-300' : 'text-purple-900'
              }`}>
                <User className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                Depoente / Ouvido(a)
              </p>
              <h4 className={`text-[13px] font-black tracking-tight leading-snug break-words ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}>
                {oitiva.personName}
              </h4>
            </div>

            {/* Quick Details Grid (Phone, Procedure, Location, Delegado) */}
            <div className={`space-y-1 text-[11px] mb-2.5 p-2 rounded-xl border ${
              isDark ? 'bg-[#180f30] border-purple-700/40' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Telefone */}
              <div className="flex items-center justify-between gap-2">
                <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                  <Phone className={`w-3 h-3 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  Telefone:
                </span>
                <span className={`font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {oitiva.phone ? formatPhone(oitiva.phone) : <span className="text-zinc-400 font-normal italic">Não informado</span>}
                </span>
              </div>

              {/* Procedimento */}
              {(oitiva.procedureType || oitiva.procedureNumber) && (
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                    <FileText className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-blue-700'}`} />
                    Procedimento:
                  </span>
                  <span className={`font-mono font-black truncate max-w-[170px] ${isDark ? 'text-blue-200' : 'text-blue-950'}`} title={oitiva.procedureNumber}>
                    {oitiva.procedureNumber || oitiva.procedureType || 'Em andamento'}
                  </span>
                </div>
              )}

              {/* Local / Sala */}
              {oitiva.locationOrLink && (
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                    <MapPin className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                    Local:
                  </span>
                  <span className={`truncate max-w-[170px] ${isDark ? 'text-zinc-200' : 'text-slate-900'}`} title={oitiva.locationOrLink}>
                    {oitiva.locationOrLink}
                  </span>
                </div>
              )}

              {/* Delegado Responsável */}
              {oitiva.officerName && (
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                    <Shield className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    Delegado:
                  </span>
                  <span className={`truncate max-w-[170px] ${isDark ? 'text-zinc-200' : 'text-slate-900 font-bold'}`} title={oitiva.officerName}>
                    {oitiva.officerName}
                  </span>
                </div>
              )}
            </div>

            {/* Status da Intimação com alteração manual direta */}
            <div className="mb-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onToggleIntimationSent) {
                    onToggleIntimationSent(oitiva.id, !oitiva.intimationSent);
                  }
                }}
                className={`w-full p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm ${
                  oitiva.intimationSent
                    ? isDark
                      ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-500/70 text-emerald-200'
                      : 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-950 font-bold'
                    : isDark
                      ? 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-500/60 text-amber-200'
                      : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-950 font-bold'
                }`}
                title="Clique para alternar o status da intimação manualmente"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {oitiva.intimationSent ? (
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
                  ) : (
                    <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                  )}
                  <div className="text-left truncate">
                    <span className="text-[9px] uppercase font-extrabold tracking-wider block opacity-80 leading-tight">
                      Intimação:
                    </span>
                    <span className={`text-[11px] font-black truncate block leading-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {oitiva.intimationSent ? 'ENVIADA / EMITIDA' : 'PENDENTE DE ENVIO'}
                    </span>
                  </div>
                </div>

                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 border ${
                  oitiva.intimationSent
                    ? isDark ? 'bg-emerald-500 text-emerald-950' : 'bg-emerald-200 text-emerald-950 border-emerald-400'
                    : isDark ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' : 'bg-amber-200 text-amber-950 border-amber-400'
                }`}>
                  {oitiva.intimationSent ? 'Enviada' : 'Mudar'}
                </span>
              </button>
            </div>

            {/* Current Status Display */}
            <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                Status Atual:
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                isDark 
                  ? currentStatusConfig.badgeBg 
                  : oitiva.status === 'Realizada'
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    : oitiva.status === 'Remarcada'
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : oitiva.status === 'Não Compareceu'
                    ? 'bg-orange-100 text-orange-950 border-orange-300'
                    : oitiva.status === 'Cancelada'
                    ? 'bg-rose-100 text-rose-950 border-rose-300'
                    : 'bg-purple-100 text-purple-950 border-purple-300'
              }`}>
                <CurrentIcon className="w-3 h-3" />
                {oitiva.status}
              </span>
            </div>

            {/* Status Change Shortcut Buttons */}
            {onQuickStatusChange && (
              <div className={`pt-1.5 border-t ${isDark ? 'border-purple-700/50' : 'border-purple-200'}`}>
                <p className={`text-[9px] font-black uppercase tracking-wider mb-1 flex items-center justify-between ${
                  isDark ? 'text-purple-300' : 'text-purple-900'
                }`}>
                  <span>Atalho Rápido de Status:</span>
                  <span className={`text-[8px] normal-case font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>1-clique</span>
                </p>
                
                <div className="grid grid-cols-5 gap-1">
                  {STATUS_LIST.map((item) => {
                    const isCurrent = oitiva.status === item.status;
                    const isPendingThis = statusChanging === item.status;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={(e) => handleQuickStatus(e, item.status)}
                        className={`py-1.5 px-0.5 rounded-lg text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 border cursor-pointer ${
                          isCurrent
                            ? isDark
                              ? `${item.activeBg} ${item.activeBorder} shadow-md ring-1 ring-white/50 scale-[1.03]`
                              : 'bg-purple-600 text-white border-purple-700 shadow-md ring-1 ring-purple-300 scale-[1.03]'
                            : isDark
                              ? `bg-[#1a1136] text-zinc-300 border-purple-800/80 ${item.hoverBg}`
                              : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={`Alterar para ${item.label}`}
                      >
                        {isPendingThis ? (
                          <Check className="w-3 h-3 text-white animate-bounce" />
                        ) : (
                          <ItemIcon className={`w-3 h-3 ${isCurrent ? 'text-white' : isDark ? '' : 'text-slate-600'}`} />
                        )}
                        <span className="truncate w-full text-center leading-tight">
                          {item.label === 'Não Compareceu' ? 'Faltou' : item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Action Links */}
            <div className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 ${
              isDark ? 'border-purple-700/50' : 'border-purple-200'
            }`}>
              {oitiva.phone && onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onOpenWhatsApp(oitiva);
                  }}
                  className={`flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer py-1 px-2 rounded-lg border ${
                    isDark
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border-emerald-500/30'
                      : 'text-emerald-950 hover:bg-emerald-100 border-emerald-300 bg-emerald-50'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp</span>
                </button>
              )}

              {onSelectOitiva && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onSelectOitiva(oitiva);
                  }}
                  className={`ml-auto flex items-center gap-1 text-[10px] font-black transition-colors cursor-pointer py-1 px-2.5 rounded-lg border shadow-sm ${
                    isDark
                      ? 'text-purple-300 hover:text-white bg-purple-950/80 hover:bg-purple-900 border-purple-500/60'
                      : 'text-purple-950 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 border-purple-300'
                  }`}
                >
                  <span>Ver Detalhes</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
