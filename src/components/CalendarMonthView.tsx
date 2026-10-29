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
  MessageCircle,
  ArrowLeftRight
} from 'lucide-react';
import { Oitiva, HearingStatus, CalendarSpecialDate } from '../types/oitiva';
import { getFirstName } from '../utils/formatters';
import { specialDateService } from '../services/specialDateService';
import { OitivaTooltip } from './OitivaTooltip';
import { HolidayTooltip } from './HolidayTooltip';
import { SwipeableOitivaCard } from './SwipeableOitivaCard';
import { useSwipeGesture } from '../utils/useSwipeGesture';
import { hapticSelection, hapticStatusChange, hapticToggle, hapticSwipe } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

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
  onDeleteOitiva?: (id: string) => Promise<void> | void;
  onRescheduleOitiva?: (id: string, newDate: string, newTime: string, reason?: string) => Promise<void> | void;
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
  onDeleteOitiva,
  onRescheduleOitiva,
  statusFilter,
  specialDates = [],
  onOpenHolidaysModal,
  isAdmin = false
}) => {
  const { isDark } = useTheme();
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
        <div className={`border-2 rounded-2xl p-3 shadow-lg ${
          isDark 
            ? 'bg-[#151026] border-purple-700/70 shadow-purple-950/70' 
            : 'bg-white border-purple-200 shadow-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className={`text-base font-black tracking-tight capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <span className={`text-[10px] font-medium ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                Deslize para trocar de mês • Toque para ver a pauta
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className={`p-1.5 rounded-xl border transition-all ${
                  isDark 
                    ? 'bg-[#1d1633] active:bg-[#2a204a] text-zinc-200 border-purple-700/60' 
                    : 'bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all ${
                  isDark 
                    ? 'bg-purple-900 active:bg-purple-800 text-white border-purple-400/80' 
                    : 'bg-purple-100 active:bg-purple-200 text-purple-950 border-purple-400 font-black'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className={`p-1.5 rounded-xl border transition-all ${
                  isDark 
                    ? 'bg-[#1d1633] active:bg-[#2a204a] text-zinc-200 border-purple-700/60' 
                    : 'bg-slate-100 active:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact Month Matrix */}
        <div className={`border-2 rounded-2xl p-2 shadow-xl ${
          isDark 
            ? 'bg-[#0e0a1b] border-purple-700/70 shadow-purple-950/70' 
            : 'bg-white border-purple-200 shadow-slate-200'
        }`}>
          {/* Weekdays row */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dw, i) => (
              <div 
                key={i} 
                className={`text-[11px] font-black uppercase py-1 ${
                  i === 0 || i === 6 
                    ? (isDark ? 'text-red-400' : 'text-rose-700') 
                    : (isDark ? 'text-zinc-300' : 'text-slate-700')
                }`}
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
                      ? (isDark ? 'bg-purple-600 border-2 border-white text-white font-black shadow-lg shadow-purple-900 scale-[1.03] z-10' : 'bg-purple-600 border-2 border-purple-800 text-white font-black shadow-md scale-[1.03] z-10')
                      : isCurrentDay
                      ? (isDark ? 'bg-[#2a174a] border-2 border-amber-400/90 text-amber-200 font-bold' : 'bg-amber-100 border-2 border-amber-500 text-amber-950 font-black')
                      : !isCurrentMonth
                      ? isWeekendDay ? (isDark ? 'bg-[#15040a]/40 text-red-900/50' : 'bg-rose-50/50 text-rose-300') : (isDark ? 'bg-[#0a0614]/40 text-zinc-700' : 'bg-slate-100/50 text-slate-400')
                      : isWeekendDay
                      ? (isDark ? 'bg-[#220710] border border-red-900/50 text-red-300 hover:bg-[#2c0a15]' : 'bg-rose-50 border border-rose-300 text-rose-950 hover:bg-rose-100')
                      : (isDark ? 'bg-[#141026] border border-purple-800/40 text-zinc-100 hover:bg-[#1c1636]' : 'bg-slate-50 border border-slate-200 text-slate-900 hover:bg-purple-50')
                  }`}
                >
                  {/* Day Number */}
                  <span className={`text-[12px] font-mono leading-none ${
                    isSelected 
                      ? 'text-white font-black' 
                      : isCurrentDay 
                      ? (isDark ? 'text-amber-300 font-black' : 'text-amber-950 font-black') 
                      : isWeekendDay 
                      ? (isDark ? 'text-red-400 font-bold' : 'text-rose-900 font-bold') 
                      : (isDark ? 'text-zinc-200 font-bold' : 'text-slate-800 font-bold')
                  }`}>
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
            <div className={`border-2 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 ${
              isDark 
                ? 'bg-[#0e0a1b] border-purple-600/70 shadow-purple-950/90' 
                : 'bg-white border-purple-200 shadow-slate-200'
            }`}>
              {/* Panel Header */}
              <div className={`flex items-center justify-between pb-2.5 border-b ${
                isDark ? 'border-purple-800/60' : 'border-slate-200'
              }`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      isDark ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      {isSelToday ? 'Hoje' : format(selDateObj, "EEEE", { locale: ptBR })}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>•</span>
                    <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {format(selDateObj, "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {selOitivas.length} oitiva(s) nesta data
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddOitivaForDate(selectedMobileDate)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black shadow-md active:scale-95 transition-all ${
                    isDark 
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/80' 
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-400 shadow-sm'
                  }`}
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
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2 shadow-md ${
                    isDark 
                      ? 'bg-[#240810] border-red-500 text-white' 
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  } ${isAdmin ? 'cursor-pointer active:scale-98' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                      isDark 
                        ? 'bg-red-950 border-red-500/80 text-red-300' 
                        : 'bg-rose-100 border-rose-300 text-rose-700'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-wider block ${
                        isDark ? 'text-red-300' : 'text-rose-800 font-bold'
                      }`}>
                        {sp.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado Oficial'}
                      </span>
                      <p className={`text-xs font-black ${isDark ? 'text-red-100' : 'text-rose-950'}`}>{sp.title}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className={`text-[10px] font-bold underline ${isDark ? 'text-red-300' : 'text-rose-700'}`}>Editar</span>
                  )}
                </div>
              ))}

              {/* List of Oitivas with Horizontal Swipe Gestures */}
              {selOitivas.length > 0 ? (
                <div className="space-y-2.5">
                  {/* Subtle Swipe Guide Hint */}
                  <div className={`flex items-center justify-between text-[10px] px-1 font-medium select-none ${
                    isDark ? 'text-zinc-400' : 'text-slate-600'
                  }`}>
                    <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-emerald-400/90' : 'text-emerald-800'}`}>
                      <span>👉 Deslize para Concluir</span>
                    </span>
                    <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-purple-300/80' : 'text-purple-800'}`}>
                      <span>👈 Remarcar / Deletar</span>
                    </span>
                  </div>

                  {selOitivas.map((oitiva) => (
                    <SwipeableOitivaCard
                      key={oitiva.id}
                      oitiva={oitiva}
                      onSelectOitiva={onSelectOitiva}
                      onQuickStatusChange={onQuickStatusChange}
                      onToggleIntimationSent={onToggleIntimationSent}
                      onOpenWhatsApp={onOpenWhatsApp}
                      onDeleteOitiva={onDeleteOitiva}
                      onRescheduleOitiva={onRescheduleOitiva}
                    />
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 px-4 rounded-xl border border-dashed flex flex-col items-center gap-2 ${
                  isDark 
                    ? 'bg-[#140e26] border-purple-800/60 text-zinc-300' 
                    : 'bg-slate-50 border-slate-300 text-slate-600'
                }`}>
                  <CalendarIcon className={`w-8 h-8 ${isDark ? 'text-purple-400/50' : 'text-purple-600/50'}`} />
                  <p className={`text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Nenhuma oitiva agendada para {format(selDateObj, "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <button
                    type="button"
                    onClick={() => onAddOitivaForDate(selectedMobileDate)}
                    className={`mt-1 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black shadow-md ${
                      isDark 
                        ? 'bg-purple-700 active:bg-purple-600 text-white' 
                        : 'bg-purple-100 active:bg-purple-200 text-purple-950 border border-purple-400'
                    }`}
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
      <div className={`hidden sm:block border-2 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isDark 
          ? 'bg-[#0e0a1b] border-purple-600/70 shadow-purple-950/80' 
          : 'bg-white border-purple-200 shadow-slate-200'
      }`}>
        
        {/* Calendar Header / Navigation Controls */}
        <div className={`flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 border-b-2 gap-3 ${
          isDark 
            ? 'border-purple-700/60 bg-[#151026]' 
            : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md ${
              isDark 
                ? 'bg-purple-950 border-purple-400/80 text-purple-200' 
                : 'bg-purple-100 border-purple-300 text-purple-800'
            }`}>
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-lg sm:text-2xl font-black tracking-tight capitalize ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <p className={`text-[11px] sm:text-xs font-medium ${
                isDark ? 'text-purple-300' : 'text-slate-600'
              }`}>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer shadow-sm ${
                  isDark 
                    ? 'bg-[#2b0c16] hover:bg-[#3d1220] text-red-300 hover:text-white border-red-500/70 hover:border-red-400' 
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 hover:border-rose-400'
                }`}
                title="Gerenciar Feriados e Fins de Semana"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Feriados & Fins de Semana</span>
              </button>
            )}

            <button
              id="month-prev-btn"
              onClick={prevMonth}
              className={`p-2 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-purple-300'
              }`}
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              id="month-today-btn"
              onClick={goToToday}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 hover:border-purple-400 font-black'
              }`}
            >
              Hoje
            </button>

            <button
              id="month-next-btn"
              onClick={nextMonth}
              className={`p-2 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-purple-300'
              }`}
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className={`grid grid-cols-7 border-b-2 ${isDark ? 'border-purple-700/60 bg-[#130d22]' : 'border-slate-200 bg-slate-100'}`}>
          {weekDays.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2.5 text-center text-[11px] sm:text-xs font-black tracking-wider uppercase ${
                idx === 0 || idx === 6 
                  ? (isDark ? 'text-red-400 bg-[#220811]/90' : 'text-rose-700 bg-rose-50 font-black') 
                  : (isDark ? 'text-zinc-200' : 'text-slate-800 font-bold')
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid: Adequa-se naturalmente ao espaço necessário para acomodar todas as entradas sem scrollbar interna */}
        <div className={`grid grid-cols-7 divide-x-2 divide-y-2 ${isDark ? 'divide-purple-700/50 bg-[#0c0817]' : 'divide-slate-200 bg-slate-200'}`}>
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
                    ? (isDark ? 'ring-4 ring-purple-400 bg-purple-900/60 shadow-2xl scale-[1.01] z-20' : 'ring-4 ring-purple-500 bg-purple-100 shadow-xl scale-[1.01] z-20')
                    : !isCurrentMonth 
                    ? isWeekendDay ? (isDark ? 'bg-[#15040a]/90 opacity-40' : 'bg-rose-50/40 opacity-50') : (isDark ? 'bg-[#080511]/90 opacity-40' : 'bg-slate-100/50 opacity-50') 
                    : isWeekendDay
                    ? (isDark ? 'bg-[#220710] hover:bg-[#2c0a15]' : 'bg-rose-50/70 hover:bg-rose-100/80')
                    : (isDark ? 'bg-[#141026] hover:bg-[#1a1432]' : 'bg-white hover:bg-purple-50/40')
                } ${isCurrentDay && !isDragTarget ? (isDark ? 'ring-2 ring-purple-400 bg-purple-950/40 z-10' : 'ring-2 ring-purple-500 bg-purple-50 z-10') : ''}`}
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
                          ? (isDark ? 'text-red-300 font-extrabold bg-[#3b0d1a] border-2 border-red-500/70 shadow-sm' : 'text-rose-950 font-extrabold bg-rose-100 border-2 border-rose-300 shadow-sm')
                          : (isDark ? 'text-white font-extrabold bg-[#1e163b] border-2 border-purple-500/60 shadow-sm' : 'text-slate-900 font-extrabold bg-slate-100 border-2 border-slate-300 shadow-sm')
                        : isWeekendDay
                        ? (isDark ? 'text-red-900/60 font-semibold' : 'text-rose-400 font-semibold')
                        : (isDark ? 'text-zinc-500 font-semibold' : 'text-slate-400 font-semibold')
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
                          ? (isDark ? 'bg-purple-900 text-white border-2 border-purple-400 shadow-sm' : 'bg-purple-100 text-purple-950 border-2 border-purple-400 font-black shadow-sm')
                          : isCurrentMonth
                          ? isWeekendDay
                            ? (isDark ? 'text-red-400/80 bg-[#340b17]/60 border border-red-900/60' : 'text-rose-700 bg-rose-100/60 border border-rose-300')
                            : (isDark ? 'text-zinc-400 bg-purple-950/40 border border-purple-900/60' : 'text-slate-500 bg-slate-100 border border-slate-300')
                          : (isDark ? 'text-zinc-600' : 'text-slate-400')
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
                        className={`p-1.5 sm:p-2 rounded-xl text-left border-2 transition-all shadow-md ${
                          isDark 
                            ? 'bg-[#240810] border-red-500 text-white' 
                            : 'bg-rose-50 border-rose-300 text-rose-950'
                        } ${
                          isAdmin ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
                        }`}
                      >
                        {/* CARDS DE FERIADOS (EM VERMELHO) */}
                        <div className="flex items-center justify-between gap-1 text-[10px] leading-none mb-1">
                          <span className={`font-black flex items-center gap-1 font-mono shrink-0 ${
                            isDark ? 'text-red-300' : 'text-rose-800'
                          }`}>
                            <Sparkles className={`w-2.5 h-2.5 ${isDark ? 'text-red-400' : 'text-rose-600'}`} />
                            Feriado
                          </span>
                          <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                            isDark 
                              ? 'bg-red-950 text-red-300 border-2 border-red-500/80' 
                              : 'bg-rose-100 text-rose-900 border border-rose-300'
                          }`}>
                            {sp.type === 'ponto_facultativo' ? 'facultativo' : 'feriado'}
                          </span>
                        </div>

                        {/* Nome do Feriado em Vermelho */}
                        <div className="pt-0.5">
                          <p className={`text-xs font-black tracking-tight leading-tight break-words ${
                            isDark ? 'text-red-400' : 'text-rose-950'
                          }`}>
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
                    let cardClasses = isDark 
                      ? 'bg-[#1e1338] border-2 border-purple-400 text-white hover:border-purple-200 hover:bg-[#281a4b]'
                      : 'bg-white border-2 border-purple-400 text-slate-900 hover:border-purple-600 hover:bg-purple-50/70 shadow-sm';
                    let statusBadgeClasses = isDark
                      ? 'bg-purple-950 text-purple-200 border-2 border-purple-400/80'
                      : 'bg-purple-100 text-purple-950 border border-purple-300 font-bold';

                    if (status === 'Realizada') {
                      cardClasses = isDark
                        ? 'bg-[#062417] border-2 border-emerald-400 text-white hover:border-emerald-200 hover:bg-[#0c3624]'
                        : 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950 hover:border-emerald-600 hover:bg-emerald-100/80 shadow-sm';
                      statusBadgeClasses = isDark
                        ? 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400/80'
                        : 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold';
                    } else if (status === 'Não Compareceu') {
                      cardClasses = isDark
                        ? 'bg-[#2f1007] border-2 border-orange-400 text-white hover:border-orange-200 hover:bg-[#43170a]'
                        : 'bg-orange-50 border-2 border-orange-400 text-orange-950 hover:border-orange-600 hover:bg-orange-100/80 shadow-sm';
                      statusBadgeClasses = isDark
                        ? 'bg-orange-950 text-orange-200 border-2 border-orange-400/80'
                        : 'bg-orange-100 text-orange-950 border border-orange-300 font-bold';
                    } else if (status === 'Cancelada') {
                      cardClasses = isDark
                        ? 'bg-[#290812] border-2 border-rose-400 text-white line-through opacity-90 hover:border-rose-200 hover:bg-[#3d0c1b]'
                        : 'bg-rose-50 border-2 border-rose-300 text-rose-950 line-through opacity-85 hover:bg-rose-100 shadow-sm';
                      statusBadgeClasses = isDark
                        ? 'bg-rose-950 text-rose-200 border-2 border-rose-400/80 no-underline'
                        : 'bg-rose-100 text-rose-950 border border-rose-300 font-bold no-underline';
                    } else if (status === 'Remarcada') {
                      cardClasses = isDark
                        ? 'bg-[#291b05] border-2 border-amber-400 text-white hover:border-amber-200 hover:bg-[#3d2908]'
                        : 'bg-amber-50 border-2 border-amber-400 text-amber-950 hover:border-amber-600 hover:bg-amber-100/80 shadow-sm';
                      statusBadgeClasses = isDark
                        ? 'bg-amber-950 text-amber-200 border-2 border-amber-400/80'
                        : 'bg-amber-100 text-amber-950 border border-amber-300 font-bold';
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
                              className={`inline-flex items-center gap-1 font-mono font-black text-[11px] sm:text-xs px-2 py-0.5 rounded-lg shadow-md shrink-0 tracking-tight ${
                                isDark 
                                  ? 'bg-black/85 text-amber-300 border border-amber-400/80' 
                                  : 'bg-amber-100 text-amber-950 border border-amber-400 font-bold'
                              }`}
                              title={`Horário marcado: ${oitiva.time || 'Não definido'}`}
                            >
                              <Clock className={`w-3 h-3 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
                              {oitiva.time || '--:--'}
                            </span>
                            <div className="flex items-center gap-1 min-w-0">
                              {oitiva.modality === 'Videoconferência' && (
                                <Video className={`w-3 h-3 shrink-0 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} title="Videoconferência" />
                              )}
                              <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${statusBadgeClasses}`}>
                                {status.toLowerCase()}
                              </span>
                            </div>
                          </div>

                          {/* Linha Principal: Primeiro Nome e Tag de Papel */}
                          <div className="flex items-center justify-between gap-1 pt-0.5 min-w-0">
                            <p className={`text-xs font-black tracking-tight leading-tight break-words min-w-0 flex-1 ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {firstName}
                            </p>
                            {oitiva.role && (
                              <span className={`text-[8px] font-bold px-1 py-0.2 rounded shrink-0 max-w-[65px] truncate ${
                                isDark ? 'bg-black/60 text-white/90 border border-white/30' : 'bg-slate-200 text-slate-900 border border-slate-300 font-bold'
                              }`} title={oitiva.role}>
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
                    className={`text-[10px] font-bold text-center py-1 rounded-lg border-2 border-dashed cursor-pointer transition-colors mt-auto ${
                      isDark 
                        ? 'text-purple-300 bg-purple-950/60 border-purple-500/50 hover:text-white' 
                        : 'text-purple-950 bg-purple-100/70 border-purple-400 hover:bg-purple-200'
                    }`}
                  >
                    + Agendar
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & Status Legend */}
        <div className={`p-3.5 sm:p-4 border-t-2 flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark 
            ? 'bg-[#130d22] border-purple-700/60 text-zinc-300' 
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs">
            <span className={`font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Legenda:</span>
            <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-purple-400"></span>
              <span>Agendada</span>
            </div>
            <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400"></span>
              <span>Realizada</span>
            </div>
            <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-400"></span>
              <span>Não Compareceu</span>
            </div>
            <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-400"></span>
              <span>Cancelada</span>
            </div>
            <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-red-300' : 'text-rose-900'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300"></span>
              <span>Feriados & Fins de Semana</span>
            </div>
          </div>

          <div className={`text-xs font-medium ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>
            Ambiente Oficial • Sincronizado no Firebase
          </div>
        </div>

      </div>

    </div>
  );
};
