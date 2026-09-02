import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, 
  Video, 
  FileText, 
  MessageCircle, 
  CheckCircle2, 
  Trash2, 
  RotateCcw, 
  Calendar as CalendarIcon,
  X,
  AlertTriangle
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { hapticSelection, hapticStatusChange, hapticToggle, hapticWarning } from '../utils/haptics';

interface SwipeableOitivaCardProps {
  oitiva: Oitiva;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onQuickStatusChange?: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextSent: boolean) => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  onDeleteOitiva?: (id: string) => Promise<void> | void;
  onRescheduleOitiva?: (id: string, newDate: string, newTime: string, reason?: string) => Promise<void> | void;
}

const cycleHearingStatus = (current: HearingStatus): HearingStatus => {
  const cycle: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];
  const idx = cycle.indexOf(current);
  if (idx === -1) return 'Agendada';
  return cycle[(idx + 1) % cycle.length];
};

export const SwipeableOitivaCard: React.FC<SwipeableOitivaCardProps> = ({
  oitiva,
  onSelectOitiva,
  onQuickStatusChange,
  onToggleIntimationSent,
  onOpenWhatsApp,
  onDeleteOitiva,
  onRescheduleOitiva
}) => {
  const [translateX, setTranslateX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  
  // Reschedule state
  const [newDate, setNewDate] = useState<string>(oitiva.date || new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState<string>(oitiva.time || '09:00');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  // Swipe tracking refs
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const currentTranslateXRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const hasTriggeredHapticRef = useRef<boolean>(false);

  const status = oitiva.status || 'Agendada';

  // Card theme styling according to status
  let cardBg = 'bg-[#19112e] border-purple-500/70 text-white';
  let statusPill = 'bg-purple-950 text-purple-200 border-purple-400';

  if (status === 'Realizada') {
    cardBg = 'bg-[#082216] border-emerald-500/70 text-white';
    statusPill = 'bg-emerald-950 text-emerald-200 border-emerald-400';
  } else if (status === 'Não Compareceu') {
    cardBg = 'bg-[#291008] border-orange-500/70 text-white';
    statusPill = 'bg-orange-950 text-orange-200 border-orange-400';
  } else if (status === 'Cancelada') {
    cardBg = 'bg-[#250811] border-rose-500/70 text-white line-through opacity-90';
    statusPill = 'bg-rose-950 text-rose-200 border-rose-400 no-underline';
  } else if (status === 'Remarcada') {
    cardBg = 'bg-[#261906] border-amber-500/70 text-white';
    statusPill = 'bg-amber-950 text-amber-200 border-amber-400';
  }

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    currentTranslateXRef.current = translateX;
    isHorizontalSwipeRef.current = null;
    hasTriggeredHapticRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Detect direction on initial movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
        isHorizontalSwipeRef.current = true;
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = false;
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    let targetX = currentTranslateXRef.current + deltaX;

    // Dampen drag past maximums
    if (targetX > 140) {
      targetX = 140 + (targetX - 140) * 0.2;
    } else if (targetX < -180) {
      targetX = -180 + (targetX + 180) * 0.2;
    }

    // Trigger haptic once threshold is crossed
    if (targetX >= 75 && !hasTriggeredHapticRef.current) {
      hapticToggle();
      hasTriggeredHapticRef.current = true;
    } else if (targetX < 75 && targetX > -70) {
      hasTriggeredHapticRef.current = false;
    }

    setTranslateX(targetX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (translateX >= 75) {
      // SWIPE RIGHT: Concluir Oitiva Automaticamente
      hapticStatusChange();
      setTranslateX(0);
      if (onQuickStatusChange) {
        onQuickStatusChange(oitiva.id, 'Realizada');
      }
    } else if (translateX <= -65) {
      // SWIPE LEFT: Revelar Atalhos de 'Remarcar' e 'Deletar'
      hapticSelection();
      setTranslateX(-150); // Mantém aberto
    } else {
      // Retorna ao estado inicial
      setTranslateX(0);
    }
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
    setTranslateX(0);
  };

  const closeActions = () => {
    setTranslateX(0);
  };

  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    setIsSubmittingReschedule(true);
    try {
      if (onRescheduleOitiva) {
        await onRescheduleOitiva(oitiva.id, newDate, newTime || oitiva.time || '09:00', rescheduleReason);
      } else if (onQuickStatusChange) {
        onQuickStatusChange(oitiva.id, 'Remarcada');
      }
      setShowRescheduleModal(false);
      closeActions();
    } catch (err) {
      console.error('Erro ao remarcar:', err);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleExecuteDelete = async () => {
    try {
      if (onDeleteOitiva) {
        await onDeleteOitiva(oitiva.id);
      }
      setShowDeleteConfirm(false);
      closeActions();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const isSwipingRight = translateX > 0;
  const isRightThresholdReached = translateX >= 75;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl select-none touch-pan-y">
        
        {/* ========================================================================= */}
        {/* BACKGROUND REVEAL - RIGHT SWIPE (CONCLUIR / REALIZADA)                     */}
        {/* ========================================================================= */}
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 flex items-center px-5 transition-opacity ${
            isSwipingRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2.5 text-white font-black text-sm">
            <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-transform ${
              isRightThresholdReached ? 'scale-125 bg-white text-emerald-700' : 'scale-100'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>
              {isRightThresholdReached ? '✓ Solte para Concluir!' : 'Arrastar para Concluir'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BACKGROUND REVEAL - LEFT SWIPE (REMARCAR & DELETAR)                       */}
        {/* ========================================================================= */}
        <div 
          className={`absolute inset-y-0 right-0 w-[150px] bg-[#140b24] border-l-2 border-purple-500/40 flex items-center justify-end z-0 ${
            translateX < 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Botão Remarcar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticSelection();
              setShowRescheduleModal(true);
            }}
            className="flex-1 h-full bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white flex flex-col items-center justify-center gap-1 text-[11px] font-black border-r border-amber-400/40 active:scale-95 transition-all cursor-pointer"
            title="Remarcar Oitiva"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Remarcar</span>
          </button>

          {/* Botão Deletar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hapticWarning();
              setShowDeleteConfirm(true);
            }}
            className="flex-1 h-full bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white flex flex-col items-center justify-center gap-1 text-[11px] font-black active:scale-95 transition-all cursor-pointer"
            title="Deletar Oitiva"
          >
            <Trash2 className="w-4 h-4" />
            <span>Deletar</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CARD PRINCIPAL (SUPERFÍCIE DESLIZÁVEL COM TOUCH EVENTS)                   */}
        {/* ========================================================================= */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)'
          }}
          className={`relative z-10 p-3 rounded-2xl border-2 ${cardBg} shadow-md flex flex-col gap-2 transition-colors`}
        >
          {/* Overlay invisível para fechar o menu deslizante ao tocar se estiver aberto */}
          {translateX < -50 && !isDragging && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                closeActions();
              }}
              className="absolute inset-0 z-30 bg-transparent"
            />
          )}

          {/* Top line: Time + Modality + Interactive Status Badge (Cycling) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-black/80 text-amber-300 border border-amber-400/80 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {oitiva.time || '--:--'}
              </span>
              {oitiva.modality === 'Videoconferência' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                  <Video className="w-3 h-3" />
                  Online
                </span>
              )}
            </div>

            {/* Interactive Status Button: Tap to cycle status */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticStatusChange();
                if (onQuickStatusChange) {
                  const next = cycleHearingStatus(status);
                  onQuickStatusChange(oitiva.id, next);
                }
              }}
              className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider border-2 shadow-sm transition-all active:scale-90 flex items-center gap-1.5 cursor-pointer select-none ${statusPill}`}
              title="Toque para alternar o status da oitiva"
            >
              <span>{status}</span>
              <span className="text-[9px] opacity-75 font-mono">↻</span>
            </button>
          </div>

          {/* Middle Line: Person Name (Clickable to open modal) + Role Badge */}
          <div 
            onClick={() => {
              if (translateX < -30) {
                closeActions();
                return;
              }
              hapticSelection();
              onSelectOitiva(oitiva);
            }}
            className="flex items-start justify-between gap-2 pt-0.5 cursor-pointer group active:opacity-80 transition-opacity"
            title="Toque no nome para abrir os detalhes da oitiva"
          >
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-black text-white leading-tight group-hover:text-purple-200 transition-colors">
                {oitiva.personName || 'Depoente Não Informado'}
              </h4>
              <p className="text-[11px] text-purple-300/80 font-mono mt-0.5 truncate">
                {oitiva.procedureNumber ? `Proc: ${oitiva.procedureNumber}` : 'Sem número de procedimento'}
              </p>
            </div>
            {oitiva.role && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950 text-purple-200 border border-purple-500/50 shrink-0">
                {oitiva.role}
              </span>
            )}
          </div>

          {/* Bottom Line: Quick Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-0.5 gap-2">
            {/* Intimation Sent Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticToggle();
                if (onToggleIntimationSent) {
                  onToggleIntimationSent(oitiva.id, !oitiva.intimationSent);
                }
              }}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all active:scale-95 ${
                oitiva.intimationSent
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>{oitiva.intimationSent ? 'Intimação Enviada' : 'Intimar'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              {/* WhatsApp Button */}
              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticSelection();
                    onOpenWhatsApp(oitiva);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="Enviar WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              )}

              {/* Details button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (translateX < -30) {
                    closeActions();
                    return;
                  }
                  hapticSelection();
                  onSelectOitiva(oitiva);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#2b1f4c] hover:bg-purple-700 text-white text-[11px] font-bold border border-purple-500/60 transition-all active:scale-95 cursor-pointer"
              >
                Ver Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIÁLOGO / MODAL DE REMARCAÇÃO RÁPIDA (REVEAL DO SWIPE ESQUERDO)            */}
      {/* ========================================================================= */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#161026] border-2 border-amber-500/70 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-300">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Remarcar Oitiva</h3>
                  <p className="text-xs text-zinc-300 truncate max-w-[220px]">{oitiva.personName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteReschedule} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nova Data da Oitiva
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full bg-[#0e0a1a] border-2 border-purple-600/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Novo Horário
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                  className="w-full bg-[#0e0a1a] border-2 border-purple-600/60 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Motivo da Remarcação (Opcional)
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="Ex: Pedido do advogado, ausência justificada..."
                  className="w-full bg-[#0e0a1a] border border-purple-900/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-amber-950/80 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isSubmittingReschedule ? 'Remarcando...' : 'Confirmar Remarcação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO (REVEAL DO SWIPE ESQUERDO)              */}
      {/* ========================================================================= */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#161026] border-2 border-rose-500/70 rounded-3xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-950 border-2 border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Excluir Oitiva?</h3>
                <p className="text-xs text-zinc-300 truncate max-w-[200px]">
                  {oitiva.personName}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Esta ação removerá o agendamento do sistema. Deseja realmente prosseguir?
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white text-xs font-black shadow-lg shadow-rose-950/80 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
