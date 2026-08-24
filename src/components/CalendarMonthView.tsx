import React, { useState } from 'react';
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
  isSameDay, 
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Video, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { getRoleBadgeClasses } from '../utils/formatters';

interface CalendarMonthViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  statusFilter: HearingStatus | 'TODOS';
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  oitivas,
  currentDate,
  onDateChange,
  onSelectOitiva,
  onAddOitivaForDate,
  statusFilter
}) => {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Month navigation
  const prevMonth = () => onDateChange(subMonths(currentDate, 1));
  const nextMonth = () => onDateChange(addMonths(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80">
        
        {/* Calendar Header / Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-b border-purple-900/30 gap-4 bg-[#141021]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <p className="text-xs text-purple-300/70">
                Grade Mensal de Oitivas e Depoimentos
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="month-prev-btn"
              onClick={prevMonth}
              className="p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              id="month-today-btn"
              onClick={goToToday}
              className="px-3.5 py-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-200 hover:text-white text-xs font-semibold border border-purple-900/40 transition-colors"
            >
              Hoje
            </button>

            <button
              id="month-next-btn"
              onClick={nextMonth}
              className="p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-purple-900/30 bg-[#0d0a17]">
          {weekDays.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-3 text-center text-xs font-semibold tracking-wider uppercase ${
                idx === 0 || idx === 6 ? 'text-purple-400/60' : 'text-zinc-400'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-purple-900/20 bg-[#0b0914]">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const dayOitivas = getOitivasForDay(day);
            const isHovered = hoveredDay === dayStr;

            return (
              <div
                key={dayStr}
                onMouseEnter={() => setHoveredDay(dayStr)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`min-h-[135px] sm:min-h-[155px] p-1.5 sm:p-2 transition-all flex flex-col justify-between group relative ${
                  !isCurrentMonth ? 'bg-[#090710]/60 opacity-40' : 'bg-[#100d1c]/40 hover:bg-[#151124]'
                } ${isCurrentDay ? 'ring-2 ring-purple-500/80 bg-purple-950/20 z-10' : ''}`}
              >
                {/* Day Header: Number + Quick Add Button */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-bold rounded-lg w-6 h-6 sm:w-7 sm:h-7 transition-all ${
                      isCurrentDay
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/60'
                        : isCurrentMonth
                        ? 'text-zinc-300'
                        : 'text-zinc-600'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Quick Add Button on Day Hover */}
                  <button
                    onClick={() => onAddOitivaForDate(dayStr)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-purple-600/30 text-purple-300 hover:text-white rounded-md transition-all text-[11px] flex items-center gap-0.5 cursor-pointer"
                    title={`Agendar oitiva para ${format(day, 'dd/MM/yyyy')}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scheduled Hearings (Oitivas) List in the Day Cell */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[105px] pr-0.5 scrollbar-thin">
                  {dayOitivas.slice(0, 3).map((oitiva) => {
                    const isCompleted = oitiva.status === 'Realizada';
                    const isMissed = oitiva.status === 'Não Compareceu';
                    const isCanceled = oitiva.status === 'Cancelada';

                    return (
                      <div
                        key={oitiva.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOitiva(oitiva);
                        }}
                        className={`p-1.5 sm:p-2 rounded-xl text-left border cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/60 text-emerald-200'
                            : isMissed
                            ? 'bg-orange-950/40 border-orange-500/30 hover:border-orange-400/60 text-orange-200'
                            : isCanceled
                            ? 'bg-rose-950/40 border-rose-500/30 hover:border-rose-400/60 text-rose-300 line-through opacity-70'
                            : 'bg-[#1e1830] border-purple-500/30 hover:border-purple-400/80 hover:bg-[#271f3f] text-zinc-100'
                        }`}
                        title={`${oitiva.time || ''} - ${oitiva.personName} (${oitiva.role || 'Oitiva'})`}
                      >
                        {/* Time & Role Badge */}
                        <div className="flex items-center justify-between gap-1 text-[10px] mb-0.5">
                          <span className="font-semibold text-purple-300 flex items-center gap-0.5 font-mono">
                            <Clock className="w-2.5 h-2.5 text-purple-400" />
                            {oitiva.time || '--:--'}
                          </span>
                          {oitiva.modality === 'Videoconferência' && (
                            <Video className="w-2.5 h-2.5 text-blue-400" title="Videoconferência" />
                          )}
                          {oitiva.role && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-200 border border-purple-800/40 truncate max-w-[65px]">
                              {oitiva.role}
                            </span>
                          )}
                        </div>

                        {/* NOME COMPLETO DO DEPOENTE (DESTAQUE PRINCIPAL) */}
                        <p className="text-xs font-bold text-white tracking-tight leading-snug truncate">
                          {oitiva.personName}
                        </p>

                        {/* Procedure number / location indicator if available */}
                        {oitiva.procedureNumber && (
                          <div className="flex items-center gap-1 text-[9px] text-zinc-400 truncate mt-0.5">
                            <FileText className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{oitiva.procedureNumber}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Overflow badge if more than 3 hearings on this day */}
                  {dayOitivas.length > 3 && (
                    <button
                      onClick={() => onAddOitivaForDate(dayStr)}
                      className="w-full text-center py-0.5 text-[10px] font-semibold text-purple-400 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-950/80 rounded-md border border-purple-900/40 transition-colors"
                    >
                      + {dayOitivas.length - 3} mais
                    </button>
                  )}
                </div>

                {/* Empty day prompt on hover */}
                {dayOitivas.length === 0 && isHovered && isCurrentMonth && (
                  <div
                    onClick={() => onAddOitivaForDate(dayStr)}
                    className="text-[10px] text-purple-400/80 hover:text-purple-200 text-center py-1 rounded bg-purple-950/20 border border-dashed border-purple-500/30 cursor-pointer transition-colors"
                  >
                    + Agendar
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & Status Legend */}
        <div className="p-4 bg-[#0d0a17] border-t border-purple-900/30 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-zinc-500 font-medium">Legenda de Cores:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span>Agendada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Realizada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>Não Compareceu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Cancelada</span>
            </div>
          </div>

          <div className="text-[11px] text-purple-300/80">
            Dica: Clique no nome do depoente para ver detalhes completos ou gerar intimação.
          </div>
        </div>

      </div>
    </div>
  );
};
