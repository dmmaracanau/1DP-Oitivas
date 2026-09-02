import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Video, 
  FileText, 
  Calendar as CalendarIcon,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import { Oitiva, HearingStatus, CalendarSpecialDate } from '../types/oitiva';
import { getFirstName } from '../utils/formatters';
import { specialDateService } from '../services/specialDateService';
import { OitivaTooltip } from './OitivaTooltip';
import { HolidayTooltip } from './HolidayTooltip';
import { useSwipeGesture } from '../utils/useSwipeGesture';
import { hapticSelection, hapticStatusChange, hapticToggle, hapticSwipe } from '../utils/haptics';

interface CalendarMonthViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  onQuickStatusChange?: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextSent: boolean) => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  onMoveOitivaDate?: (oitivaId: string, newDate: string) => Promise<void> | void;
  statusFilter: HearingStatus | 'TODOS';
  specialDates?: CalendarSpecialDate[];
  onOpenHolidaysModal?: (dateStr?: string) => void;
  isAdmin?: boolean;
}

const cycleHearingStatus = (current: HearingStatus): HearingStatus => {
  const cycle: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];
  const idx = cycle.indexOf(current);
  if (idx === -1) return 'Agendada';
  return cycle[(idx + 1) % cycle.length];
};

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  oitivas,
  currentDate,
  onDateChange,
  onSelectOitiva,
  onAddOitivaForDate,
  onQuickStatusChange,
  onToggleIntimationSent,
  onOpenWhatsApp,
  onMoveOitivaDate,
  statusFilter,
  specialDates = [],
  onOpenHolidaysModal,
  isAdmin = false
}) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [draggedOitivaId, setDraggedOitivaId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Estado para o dia selecionado na visão mobile (Touch Matrix + Painel do Dia)
  const [selectedMobileDate, setSelectedMobileDate] = useState<string>(() => {
    const today = new Date();
    if (isSameMonth(today, currentDate)) {
      return format(today, 'yyyy-MM-dd');
    }
    return format(startOfMonth(currentDate), 'yyyy-MM-dd');
  });

  // Atualiza a seleção mobile caso o mês exibido seja trocado
  useEffect(() => {
    try {
      const currentSelected = parseISO(selectedMobileDate);
      if (!isSameMonth(currentSelected, currentDate)) {
        const today = new Date();
        if (isSameMonth(today, currentDate)) {
          setSelectedMobileDate(format(today, 'yyyy-MM-dd'));
        } else {
          setSelectedMobileDate(format(startOfMonth(currentDate), 'yyyy-MM-dd'));
        }
      }
    } catch {
      setSelectedMobileDate(format(startOfMonth(currentDate), 'yyyy-MM-dd'));
    }
  }, [currentDate]);

  // Month navigation
  const prevMonth = () => {
    hapticSwipe();
    onDateChange(subMonths(currentDate, 1));
  };
  const nextMonth = () => {
    hapticSwipe();
    onDateChange(addMonths(currentDate, 1));
  };
  const goToToday = () => {
    hapticSelection();
    onDateChange(new Date());
  };

  // Mobile horizontal swipe gestures to switch previous and next months
  const mobileSwipeHandlers = useSwipeGesture({
    onSwipeLeft: nextMonth,
    onSwipeRight: prevMonth,
    minDistance: 45,
    maxVerticalOffset: 75,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Agrupa oitivas por data
  const filteredOitivas = oitivas.filter(o => {
    if (statusFilter === 'TODOS') return true;
    return o.status === statusFilter;
  });

  const getOitivasForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredOitivas.filter(o => o.date === dayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  };

  return (
    <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto px-1 sm:px-2.5 lg:px-4 pb-10">
      
      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW (sm:hidden) - Modern Touch Matrix + Selected Day Agenda Panel */}
      {/* ========================================================================= */}
      <div 
        className="sm:hidden flex flex-col gap-3 touch-pan-y select-none"
        {...mobileSwipeHandlers}
      >
        
        {/* Mobile Header / Navigation */}
        <div className="bg-[#151026] border-2 border-purple-700/70 rounded-2xl p-3 shadow-lg shadow-purple-950/70">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-black text-white tracking-tight capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <span className="text-[10px] text-purple-300 font-medium">Deslize para trocar de mês • Toque para ver a pauta</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-xl bg-[#1d1633] active:bg-[#2a204a] text-zinc-200 border border-purple-700/60 transition-all"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="px-2.5 py-1 rounded-xl bg-purple-900 active:bg-purple-800 text-white text-[11px] font-black border border-purple-400/80 transition-all"
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-xl bg-[#1d1633] active:bg-[#2a204a] text-zinc-200 border border-purple-700/60 transition-all"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact Month Matrix */}
        <div className="bg-[#0e0a1b] border-2 border-purple-700/70 rounded-2xl p-2 shadow-xl shadow-purple-950/70">
          {/* Weekdays row */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dw, i) => (
              <div 
                key={i} 
                className={`text-[11px] font-black uppercase py-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-zinc-300'}`}
              >
                {dw}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedMobileDate === dayStr;
              const dayOitivas = getOitivasForDay(day);
              const daySpecialDates = specialDateService
                .getSpecialDatesForDate(dayStr, day.getDay(), specialDates)
                .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);
              const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => {
                    hapticSelection();
                    setSelectedMobileDate(dayStr);
                  }}
                  className={`flex flex-col items-center justify-between py-1 px-0.5 rounded-xl transition-all relative min-h-[46px] ${
                    isSelected
                      ? 'bg-purple-600 border-2 border-white text-white font-black shadow-lg shadow-purple-900 scale-[1.03] z-10'
                      : isCurrentDay
                      ? 'bg-[#2a174a] border-2 border-amber-400/90 text-amber-200 font-bold'
                      : !isCurrentMonth
                      ? isWeekendDay ? 'bg-[#15040a]/40 text-red-900/50' : 'bg-[#0a0614]/40 text-zinc-700'
                      : isWeekendDay
                      ? 'bg-[#220710] border border-red-900/50 text-red-300 hover:bg-[#2c0a15]'
                      : 'bg-[#141026] border border-purple-800/40 text-zinc-100 hover:bg-[#1c1636]'
                  }`}
                >
                  {/* Day Number */}
                  <span className={`text-[12px] font-mono leading-none ${isSelected ? 'text-white font-black' : isCurrentDay ? 'text-amber-300 font-black' : isWeekendDay ? 'text-red-400 font-bold' : 'text-zinc-200 font-bold'}`}>
                    {format(day, 'dd')}
                  </span>

                  {/* Dots / Indicators */}
                  <div className="flex items-center justify-center gap-0.5 mt-1 min-h-[6px]">
                    {daySpecialDates.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Feriado" />
                    )}
                    {dayOitivas.length > 0 && (
                      <span className={`text-[9px] font-black px-1 rounded-full leading-tight ${
                        isSelected ? 'bg-white text-purple-900' : 'bg-purple-500 text-white'
                      }`}>
                        {dayOitivas.length}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda Panel (Pauta do Dia) */}
        {(() => {
          let selDateObj: Date;
          try {
            selDateObj = parseISO(selectedMobileDate);
          } catch {
            selDateObj = new Date();
          }
          const selOitivas = filteredOitivas.filter(o => o.date === selectedMobileDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
          const selSpecialDates = specialDateService
            .getSpecialDatesForDate(selectedMobileDate, selDateObj.getDay(), specialDates)
            .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);
          const isSelToday = isToday(selDateObj);

          return (
            <div className="bg-[#0e0a1b] border-2 border-purple-600/70 rounded-2xl p-3.5 shadow-2xl shadow-purple-950/90 flex flex-col gap-3">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-purple-800/60">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-purple-300 uppercase tracking-wider">
                      {isSelToday ? 'Hoje' : format(selDateObj, "EEEE", { locale: ptBR })}
                    </span>
                    <span className="text-xs text-zinc-400">•</span>
                    <span className="text-xs font-black text-white">
                      {format(selDateObj, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">
                    {selOitivas.length} oitiva(s) nesta data
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddOitivaForDate(selectedMobileDate)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-950/80 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar</span>
                </button>
              </div>

              {/* Holiday Card if any */}
              {selSpecialDates.map(sp => (
                <div 
                  key={sp.id}
                  onClick={() => {
                    if (isAdmin && onOpenHolidaysModal) {
                      onOpenHolidaysModal(selectedMobileDate);
                    }
                  }}
                  className={`p-2.5 rounded-xl bg-[#240810] border-2 border-red-500 text-white flex items-center justify-between gap-2 shadow-md ${
                    isAdmin ? 'cursor-pointer active:scale-98' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-500/80 flex items-center justify-center text-red-300 shrink-0">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-red-300 uppercase tracking-wider block">
                        {sp.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado Oficial'}
                      </span>
                      <p className="text-xs font-black text-red-100">{sp.title}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="text-[10px] text-red-300 font-bold underline">Editar</span>
                  )}
                </div>
              ))}

              {/* List of Oitivas */}
              {selOitivas.length > 0 ? (
                <div className="space-y-2.5">
                  {selOitivas.map((oitiva) => {
                    const status = oitiva.status || 'Agendada';
                    
                    let cardBg = 'bg-[#19112e] border-purple-500/70';
                    let statusPill = 'bg-purple-950 text-purple-200 border-purple-400';
                    if (status === 'Realizada') {
                      cardBg = 'bg-[#082216] border-emerald-500/70';
                      statusPill = 'bg-emerald-950 text-emerald-200 border-emerald-400';
                    } else if (status === 'Não Compareceu') {
                      cardBg = 'bg-[#291008] border-orange-500/70';
                      statusPill = 'bg-orange-950 text-orange-200 border-orange-400';
                    } else if (status === 'Cancelada') {
                      cardBg = 'bg-[#250811] border-rose-500/70';
                      statusPill = 'bg-rose-950 text-rose-200 border-rose-400';
                    } else if (status === 'Remarcada') {
                      cardBg = 'bg-[#261906] border-amber-500/70';
                      statusPill = 'bg-amber-950 text-amber-200 border-amber-400';
                    }

                    return (
                      <div
                        key={oitiva.id}
                        className={`p-3 rounded-2xl border-2 ${cardBg} shadow-md flex flex-col gap-2 transition-all`}
                      >
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
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-xl bg-[#140e26] border border-dashed border-purple-800/60 flex flex-col items-center gap-2">
                  <CalendarIcon className="w-8 h-8 text-purple-400/50" />
                  <p className="text-xs text-zinc-300 font-semibold">
                    Nenhuma oitiva agendada para {format(selDateObj, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddOitivaForDate(selectedMobileDate)}
                    className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-700 active:bg-purple-600 text-white text-xs font-black shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agendar Agora</span>
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* 🖥️ DESKTOP VIEW (hidden sm:block) - 100% PRESERVED 7-COLUMN FULL GRID     */}
      {/* ========================================================================= */}
      <div className="hidden sm:block bg-[#0e0a1b] border-2 border-purple-600/70 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/80 transition-all">
        
        {/* Calendar Header / Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 border-b-2 border-purple-700/60 gap-3 bg-[#151026]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 border-2 border-purple-400/80 flex items-center justify-center text-purple-200 shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-300 font-medium">
                Grade Mensal • Pautas, Feriados e Fins de Semana
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenHolidaysModal && onOpenHolidaysModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2b0c16] hover:bg-[#3d1220] text-red-300 hover:text-white text-xs font-black border-2 border-red-500/70 hover:border-red-400 transition-all cursor-pointer shadow-sm"
                title="Gerenciar Feriados e Fins de Semana"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Feriados & Fins de Semana</span>
              </button>
            )}

            <button
              id="month-prev-btn"
              onClick={prevMonth}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              id="month-today-btn"
              onClick={goToToday}
              className="px-3.5 py-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-white text-xs font-bold border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
            >
              Hoje
            </button>

            <button
              id="month-next-btn"
              onClick={nextMonth}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b-2 border-purple-700/60 bg-[#130d22]">
          {weekDays.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2.5 text-center text-[11px] sm:text-xs font-black tracking-wider uppercase ${
                idx === 0 || idx === 6 ? 'text-red-400 bg-[#220811]/90' : 'text-zinc-200'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid: Adequa-se naturalmente ao espaço necessário para acomodar todas as entradas sem scrollbar interna */}
        <div className="grid grid-cols-7 divide-x-2 divide-y-2 divide-purple-700/50 bg-[#0c0817]">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const dayOitivas = getOitivasForDay(day);
            const daySpecialDates = specialDateService
              .getSpecialDatesForDate(dayStr, day.getDay(), specialDates)
              .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);
            const isHovered = hoveredDay === dayStr;
            const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;

            const isDragTarget = dragOverDay === dayStr;

            return (
              <div
                key={dayStr}
                onMouseEnter={() => setHoveredDay(dayStr)}
                onMouseLeave={() => setHoveredDay(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverDay !== dayStr) {
                    setDragOverDay(dayStr);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverDay === dayStr) {
                    setDragOverDay(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverDay(null);
                  setDraggedOitivaId(null);
                  const oitivaId = e.dataTransfer.getData('text/plain');
                  if (oitivaId && onMoveOitivaDate) {
                    await onMoveOitivaDate(oitivaId, dayStr);
                  }
                }}
                className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all flex flex-col justify-between group relative ${
                  isDragTarget
                    ? 'ring-4 ring-purple-400 bg-purple-900/60 shadow-2xl scale-[1.01] z-20'
                    : !isCurrentMonth 
                    ? isWeekendDay ? 'bg-[#15040a]/90 opacity-40' : 'bg-[#080511]/90 opacity-40' 
                    : isWeekendDay
                    ? 'bg-[#220710] hover:bg-[#2c0a15]'
                    : 'bg-[#141026] hover:bg-[#1a1432]'
                } ${isCurrentDay && !isDragTarget ? 'ring-2 ring-purple-400 bg-purple-950/40 z-10' : ''}`}
              >
                {/* Visual feedback when dragging over this day */}
                {isDragTarget && (
                  <div className="absolute inset-0 bg-purple-600/30 border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center pointer-events-none z-30 backdrop-blur-[2px]">
                    <span className="text-[11px] font-black text-white bg-purple-950/90 px-2.5 py-1 rounded-lg border border-purple-400 shadow-lg">
                      Mover p/ {format(day, 'dd/MM')}
                    </span>
                  </div>
                )}
                {/* Day Header: Canto Superior Esquerdo (Dia 01) e Canto Superior Direito (Qtd 05) */}
                <div className="flex items-center justify-between mb-1.5 gap-1">
                  {/* Canto Superior Esquerdo: Dia com 2 dígitos (ex: 01, 02) */}
                  <span
                    className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-mono rounded-lg px-2 py-0.5 transition-all ${
                      isCurrentDay
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950 font-black ring-2 ring-purple-300'
                        : isCurrentMonth
                        ? isWeekendDay
                          ? 'text-red-300 font-extrabold bg-[#3b0d1a] border-2 border-red-500/70 shadow-sm'
                          : 'text-white font-extrabold bg-[#1e163b] border-2 border-purple-500/60 shadow-sm'
                        : isWeekendDay
                        ? 'text-red-900/60 font-semibold'
                        : 'text-zinc-500 font-semibold'
                    }`}
                  >
                    {format(day, 'dd')}
                  </span>

                  {/* Canto Superior Direito: Quantidade de Oitivas (ex: 05, 01, 00) + Botão de Agendamento Rápido */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddOitivaForDate(dayStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-600 text-white rounded-md transition-all text-[10px] flex items-center cursor-pointer border border-purple-400/50"
                      title={`Agendar oitiva para ${format(day, 'dd/MM/yyyy')}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`inline-flex items-center justify-center font-mono font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-md transition-all ${
                        dayOitivas.length > 0
                          ? 'bg-purple-900 text-white border-2 border-purple-400 shadow-sm'
                          : isCurrentMonth
                          ? isWeekendDay
                            ? 'text-red-400/80 bg-[#340b17]/60 border border-red-900/60'
                            : 'text-zinc-400 bg-purple-950/40 border border-purple-900/60'
                          : 'text-zinc-600'
                      }`}
                      title={`${dayOitivas.length} oitiva(s) no dia ${format(day, 'dd/MM/yyyy')}`}
                    >
                      {String(dayOitivas.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Scheduled Hearings & Special Dates List: Sem barra de scroll interna, expande a célula */}
                <div className="flex-1 space-y-1.5 py-1">
                  
                  {/* CARDS DE FERIADOS (EM VERMELHO) */}
                  {daySpecialDates.map((sp) => (
                    <HolidayTooltip
                      key={sp.id}
                      specialDate={sp}
                      dateStr={dayStr}
                      isAdmin={isAdmin}
                      onOpenHolidaysModal={onOpenHolidaysModal}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAdmin && onOpenHolidaysModal) {
                            onOpenHolidaysModal(dayStr);
                          }
                        }}
                        className={`p-1.5 sm:p-2 rounded-xl text-left border-2 transition-all shadow-md bg-[#240810] border-2 border-red-500 text-white ${
                          isAdmin ? 'cursor-pointer hover:scale-[1.02] hover:border-red-300 hover:bg-[#340c18]' : 'cursor-default'
                        }`}
                      >
                        {/* CARDS DE FERIADOS (EM VERMELHO) */}
                        <div className="flex items-center justify-between gap-1 text-[10px] leading-none mb-1">
                          <span className="font-black text-red-300 flex items-center gap-1 font-mono shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-red-400" />
                            Feriado
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 bg-red-950 text-red-300 border-2 border-red-500/80">
                            {sp.type === 'ponto_facultativo' ? 'facultativo' : 'feriado'}
                          </span>
                        </div>

                        {/* Nome do Feriado em Vermelho */}
                        <div className="pt-0.5">
                          <p className="text-xs font-black text-red-400 tracking-tight leading-tight break-words">
                            {sp.title}
                          </p>
                        </div>
                      </div>
                    </HolidayTooltip>
                  ))}

                  {/* Oitivas agendadas */}
                  {dayOitivas.map((oitiva) => {
                    const status = oitiva.status || 'Agendada';
                    const firstName = getFirstName(oitiva.personName) || oitiva.personName || 'Depoente';

                    // Definir estilo de cor de fundo e borda destacada de alto contraste conforme o status
                    let cardClasses = 'bg-[#1e1338] border-2 border-purple-400 text-white hover:border-purple-200 hover:bg-[#281a4b]';
                    let statusBadgeClasses = 'bg-purple-950 text-purple-200 border-2 border-purple-400/80';

                    if (status === 'Realizada') {
                      cardClasses = 'bg-[#062417] border-2 border-emerald-400 text-white hover:border-emerald-200 hover:bg-[#0c3624]';
                      statusBadgeClasses = 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400/80';
                    } else if (status === 'Não Compareceu') {
                      cardClasses = 'bg-[#2f1007] border-2 border-orange-400 text-white hover:border-orange-200 hover:bg-[#43170a]';
                      statusBadgeClasses = 'bg-orange-950 text-orange-200 border-2 border-orange-400/80';
                    } else if (status === 'Cancelada') {
                      cardClasses = 'bg-[#290812] border-2 border-rose-400 text-white line-through opacity-90 hover:border-rose-200 hover:bg-[#3d0c1b]';
                      statusBadgeClasses = 'bg-rose-950 text-rose-200 border-2 border-rose-400/80 no-underline';
                    } else if (status === 'Remarcada') {
                      cardClasses = 'bg-[#291b05] border-2 border-amber-400 text-white hover:border-amber-200 hover:bg-[#3d2908]';
                      statusBadgeClasses = 'bg-amber-950 text-amber-200 border-2 border-amber-400/80';
                    }

                    const isBeingDragged = draggedOitivaId === oitiva.id;

                    return (
                      <OitivaTooltip
                        key={oitiva.id}
                        oitiva={oitiva}
                        onSelectOitiva={onSelectOitiva}
                        onQuickStatusChange={onQuickStatusChange}
                        onToggleIntimationSent={onToggleIntimationSent}
                        onOpenWhatsApp={onOpenWhatsApp}
                      >
                        <div
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', oitiva.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedOitivaId(oitiva.id);
                          }}
                          onDragEnd={() => {
                            setDraggedOitivaId(null);
                            setDragOverDay(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectOitiva(oitiva);
                          }}
                          className={`p-1.5 sm:p-2 rounded-xl text-left border-2 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] shadow-md select-none ${
                            isBeingDragged ? 'opacity-40 ring-2 ring-purple-300 scale-95' : ''
                          } ${cardClasses}`}
                          title="Clique para detalhes ou arraste para outro dia"
                        >
                          {/* Linha Superior: Horário com Grande Destaque Visual + Modalidade + Status Badge */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span 
                              className="inline-flex items-center gap-1 font-mono font-black text-[11px] sm:text-xs px-2 py-0.5 rounded-lg bg-black/85 text-amber-300 border border-amber-400/80 shadow-md shrink-0 tracking-tight"
                              title={`Horário marcado: ${oitiva.time || 'Não definido'}`}
                            >
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                              {oitiva.time || '--:--'}
                            </span>
                            <div className="flex items-center gap-1 min-w-0">
                              {oitiva.modality === 'Videoconferência' && (
                                <Video className="w-3 h-3 text-cyan-300 shrink-0" title="Videoconferência" />
                              )}
                              <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${statusBadgeClasses}`}>
                                {status.toLowerCase()}
                              </span>
                            </div>
                          </div>

                          {/* Linha Principal: Primeiro Nome (Sem truncar, quebrando linhas se necessário) e Tag de Papel */}
                          <div className="flex items-center justify-between gap-1 pt-0.5 min-w-0">
                            <p className="text-xs font-black text-white tracking-tight leading-tight break-words min-w-0 flex-1">
                              {firstName}
                            </p>
                            {oitiva.role && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-black/60 text-white/90 border border-white/30 shrink-0 max-w-[65px] truncate" title={oitiva.role}>
                                {oitiva.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </OitivaTooltip>
                    );
                  })}
                </div>

                {/* Empty day prompt on hover */}
                {dayOitivas.length === 0 && daySpecialDates.length === 0 && isHovered && isCurrentMonth && (
                  <div
                    onClick={() => onAddOitivaForDate(dayStr)}
                    className="text-[10px] text-purple-300 font-bold hover:text-white text-center py-1 rounded-lg bg-purple-950/60 border-2 border-dashed border-purple-500/50 cursor-pointer transition-colors mt-auto"
                  >
                    + Agendar
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & Status Legend */}
        <div className="p-3.5 sm:p-4 bg-[#130d22] border-t-2 border-purple-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-300">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
            <span className="text-zinc-300 font-bold uppercase tracking-wider">Legenda:</span>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-white/30"></span>
              <span>Agendada</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white/30"></span>
              <span>Realizada</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 border border-white/30"></span>
              <span>Não Compareceu</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 border border-white/30"></span>
              <span>Cancelada</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-red-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300"></span>
              <span>Feriados & Fins de Semana</span>
            </div>
          </div>

          <div className="text-xs text-purple-200 font-medium">
            Ambiente Oficial • Sincronizado no Firebase
          </div>
        </div>

      </div>

    </div>
  );
};
