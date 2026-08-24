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
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Video, 
  FileText, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { getFirstName } from '../utils/formatters';

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 transition-all">
        
        {/* Calendar Header / Navigation Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 sm:p-5 border-b border-purple-900/30 gap-3 bg-[#141021]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-950/90 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-300/70">
                Grade Mensal • Dimensionamento Dinâmico de Pautas
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="month-prev-btn"
              onClick={prevMonth}
              className="p-1.5 sm:p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              id="month-today-btn"
              onClick={goToToday}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-200 hover:text-white text-xs font-semibold border border-purple-900/40 transition-colors cursor-pointer"
            >
              Hoje
            </button>

            <button
              id="month-next-btn"
              onClick={nextMonth}
              className="p-1.5 sm:p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-purple-900/30 bg-[#0d0a17]">
          {weekDays.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-bold tracking-wider uppercase ${
                idx === 0 || idx === 6 ? 'text-purple-400/60' : 'text-zinc-400'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid: Adequa-se naturalmente ao espaço necessário para acomodar todas as entradas sem scrollbar interna */}
        <div className="grid grid-cols-7 divide-x divide-y divide-purple-900/20 bg-[#0b0914]">
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
                className={`min-h-[85px] sm:min-h-[100px] p-1 sm:p-1.5 transition-colors flex flex-col justify-between group relative ${
                  !isCurrentMonth ? 'bg-[#090710]/60 opacity-35' : 'bg-[#100d1c]/40 hover:bg-[#151124]'
                } ${isCurrentDay ? 'ring-2 ring-purple-500/90 bg-purple-950/20 z-10' : ''}`}
              >
                {/* Day Header: Canto Superior Esquerdo (Dia 01) e Canto Superior Direito (Qtd 05) */}
                <div className="flex items-center justify-between mb-1 gap-1">
                  {/* Canto Superior Esquerdo: Dia com 2 dígitos (ex: 01, 02) */}
                  <span
                    className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono rounded-lg px-1.5 py-0.5 transition-all ${
                      isCurrentDay
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950 font-extrabold ring-1 ring-purple-400/40'
                        : isCurrentMonth
                        ? 'text-zinc-200 group-hover:text-purple-200 bg-purple-950/40 border border-purple-900/40'
                        : 'text-zinc-600'
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
                      className="opacity-0 group-hover:opacity-100 p-0.5 sm:p-1 hover:bg-purple-600/30 text-purple-300 hover:text-white rounded-md transition-all text-[10px] flex items-center cursor-pointer"
                      title={`Agendar oitiva para ${format(day, 'dd/MM/yyyy')}`}
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>

                    <span
                      className={`inline-flex items-center justify-center font-mono font-bold text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md transition-all ${
                        dayOitivas.length > 0
                          ? 'bg-purple-900/80 border border-purple-500/50 text-purple-200 shadow-sm'
                          : isCurrentMonth
                          ? 'text-zinc-600 bg-purple-950/20 border border-purple-950/40'
                          : 'text-zinc-700'
                      }`}
                      title={`${dayOitivas.length} oitiva(s) no dia ${format(day, 'dd/MM/yyyy')}`}
                    >
                      {String(dayOitivas.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Scheduled Hearings (Oitivas) List: Sem barra de scroll interna, expande a célula para acomodar todos os itens */}
                <div className="flex-1 space-y-1 py-0.5">
                  {dayOitivas.map((oitiva) => {
                    const isCompleted = oitiva.status === 'Realizada';
                    const isMissed = oitiva.status === 'Não Compareceu';
                    const isCanceled = oitiva.status === 'Cancelada';
                    const firstName = getFirstName(oitiva.personName);

                    return (
                      <div
                        key={oitiva.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOitiva(oitiva);
                        }}
                        className={`px-1.5 py-1 rounded-lg text-left border cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-950/50 border-emerald-500/30 hover:border-emerald-400/60 text-emerald-200'
                            : isMissed
                            ? 'bg-orange-950/50 border-orange-500/30 hover:border-orange-400/60 text-orange-200'
                            : isCanceled
                            ? 'bg-rose-950/40 border-rose-500/30 hover:border-rose-400/60 text-rose-300 line-through opacity-70'
                            : 'bg-[#1e1733] border-purple-500/30 hover:border-purple-400/80 hover:bg-[#271e42] text-zinc-100'
                        }`}
                        title={`${oitiva.time || ''} - ${oitiva.personName} (${oitiva.role || 'Oitiva'}) • Clique para ver detalhes`}
                      >
                        {/* Time & Role / Modality Indicator */}
                        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] leading-none mb-0.5">
                          <span className="font-bold text-purple-300 flex items-center gap-0.5 font-mono">
                            <Clock className="w-2.5 h-2.5 text-purple-400" />
                            {oitiva.time || '--:--'}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {oitiva.modality === 'Videoconferência' && (
                              <Video className="w-2.5 h-2.5 text-blue-400 shrink-0" title="Videoconferência" />
                            )}
                            {oitiva.role && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-purple-950/80 text-purple-200 border border-purple-800/40 truncate max-w-[55px]">
                                {oitiva.role}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PRIMEIRO NOME DO DEPOENTE (COMPACTO E CLARO) */}
                        <p className="text-[11px] sm:text-xs font-bold text-white tracking-tight leading-tight truncate">
                          {firstName}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Empty day prompt on hover */}
                {dayOitivas.length === 0 && isHovered && isCurrentMonth && (
                  <div
                    onClick={() => onAddOitivaForDate(dayStr)}
                    className="text-[9px] sm:text-[10px] text-purple-400/80 hover:text-purple-200 text-center py-0.5 rounded bg-purple-950/30 border border-dashed border-purple-500/30 cursor-pointer transition-colors mt-auto"
                  >
                    + Agendar
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & Status Legend */}
        <div className="p-3 sm:p-4 bg-[#0d0a17] border-t border-purple-900/30 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] sm:text-xs">
            <span className="text-zinc-500 font-medium">Legenda:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Agendada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Realizada</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Não Compareceu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Cancelada</span>
            </div>
          </div>

          <div className="text-[10px] sm:text-[11px] text-purple-300/80">
            Ambiente Individual • As entradas expandem a grade automaticamente
          </div>
        </div>

      </div>
    </div>
  );
};
