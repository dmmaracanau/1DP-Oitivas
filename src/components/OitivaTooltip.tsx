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

interface OitivaTooltipProps {
  oitiva: Oitiva;
  children: React.ReactNode;
  onSelectOitiva?: (oitiva: Oitiva) => void;
  onQuickStatusChange?: (id: string, newStatus: HearingStatus) => void;
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

export const OitivaTooltip: React.FC<OitivaTooltipProps> = ({
  oitiva,
  children,
  onSelectOitiva,
  onQuickStatusChange,
  onOpenWhatsApp,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; placement: 'top' | 'bottom' }>({
    left: 0,
    placement: 'bottom'
  });
  const [statusChanging, setStatusChanging] = useState<HearingStatus | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<any>(null);
  const leaveTimerRef = useRef<any>(null);

  const TOOLTIP_WIDTH = 360;

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    // Calcular posição horizontal (centralizado ou ajustado às bordas da tela)
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    if (left < 14) left = 14;
    if (left + TOOLTIP_WIDTH > windowW - 14) left = windowW - TOOLTIP_WIDTH - 14;

    // Decidir se posiciona acima ou abaixo
    const spaceBelow = windowH - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 360;

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      // Posicionar Acima
      setCoords({
        bottom: windowH - rect.top + 8,
        left,
        placement: 'top'
      });
    } else {
      // Posicionar Abaixo
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
    }, 120);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 320); // Tempo hábil para o usuário transitar com o mouse
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
    }, 280);
  };

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
    }, 1200);
  };

  // Status atual estilizado
  const currentStatusConfig = STATUS_LIST.find(s => s.status === oitiva.status) || STATUS_LIST[0];
  const CurrentIcon = currentStatusConfig.icon;

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
          {/* Tooltip Content Container */}
          <div className="bg-[#120a24] border-2 border-purple-500/80 rounded-2xl p-4 shadow-2xl shadow-purple-950/90 text-white backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden">
            
            {/* Background subtle glow */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

            {/* Top Bar: Data, Horário & Condição */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-purple-700/50">
              <div className="flex items-center gap-1.5 font-mono text-xs font-black text-purple-200">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{oitiva.time || '--:--'}</span>
                <span className="text-purple-400/60">•</span>
                <span>{formatDateBR(oitiva.date)}</span>
              </div>

              <div className="flex items-center gap-1">
                {oitiva.role && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${getRoleBadgeClasses(oitiva.role)}`}>
                    {oitiva.role}
                  </span>
                )}
                {oitiva.modality && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-cyan-300 border border-cyan-500/40">
                    {oitiva.modality}
                  </span>
                )}
              </div>
            </div>

            {/* Person Name (Full Name) */}
            <div className="mb-2.5">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-purple-300 flex items-center gap-1">
                <User className="w-3 h-3 text-purple-400" />
                Depoente / Ouvido(a)
              </p>
              <h4 className="text-sm font-black text-white tracking-tight leading-snug break-words">
                {oitiva.personName}
              </h4>
            </div>

            {/* Quick Details Grid (Phone, Procedure, Location) */}
            <div className="space-y-1.5 text-[11px] mb-3 bg-[#180f30] p-2.5 rounded-xl border border-purple-700/40">
              
              {/* Telefone */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-purple-300 font-bold flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  Telefone:
                </span>
                <span className="font-mono font-black text-white">
                  {oitiva.phone ? formatPhone(oitiva.phone) : <span className="text-zinc-500 font-normal italic">Não informado</span>}
                </span>
              </div>

              {/* Procedimento */}
              {(oitiva.procedureType || oitiva.procedureNumber) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <FileText className="w-3 h-3 text-blue-400" />
                    Procedimento:
                  </span>
                  <span className="font-mono font-black text-blue-200 truncate max-w-[180px]" title={oitiva.procedureNumber}>
                    {oitiva.procedureNumber || oitiva.procedureType || 'Em andamento'}
                  </span>
                </div>
              )}

              {/* Local / Sala */}
              {oitiva.locationOrLink && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    Local:
                  </span>
                  <span className="text-zinc-200 truncate max-w-[180px]" title={oitiva.locationOrLink}>
                    {oitiva.locationOrLink}
                  </span>
                </div>
              )}

              {/* Delegado Responsável */}
              {oitiva.officerName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" />
                    Delegado:
                  </span>
                  <span className="text-zinc-200 truncate max-w-[180px]" title={oitiva.officerName}>
                    {oitiva.officerName}
                  </span>
                </div>
              )}
            </div>

            {/* Current Status Display */}
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider">
                Status Atual:
              </span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${currentStatusConfig.badgeBg}`}>
                <CurrentIcon className="w-3 h-3" />
                {oitiva.status}
              </span>
            </div>

            {/* Status Change Shortcut Buttons */}
            {onQuickStatusChange && (
              <div className="pt-2 border-t border-purple-700/50">
                <p className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-1.5 flex items-center justify-between">
                  <span>Atalho de Status:</span>
                  <span className="text-[9px] text-zinc-400 normal-case font-medium">Clique para mudar</span>
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
                            ? `${item.activeBg} ${item.activeBorder} shadow-md ring-1 ring-white/50 scale-[1.03]`
                            : `bg-[#1a1136] text-zinc-300 border-purple-800/80 ${item.hoverBg}`
                        }`}
                        title={`Alterar para ${item.label}`}
                      >
                        {isPendingThis ? (
                          <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                        ) : (
                          <ItemIcon className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : ''}`} />
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
            <div className="mt-3 pt-2.5 border-t border-purple-700/50 flex items-center justify-between gap-2">
              {oitiva.phone && onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onOpenWhatsApp(oitiva);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-emerald-950/40 border border-emerald-500/30"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Notificar WhatsApp</span>
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
                  className="ml-auto flex items-center gap-1 text-[11px] font-black text-purple-300 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/60 shadow-sm"
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
