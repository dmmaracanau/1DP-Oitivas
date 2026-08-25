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
      <div className="bg-[#0e0a1b] border-2 border-purple-600/70 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/80 transition-all">
        
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
                Grade Mensal • Dimensionamento Dinâmico de Pautas
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
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
                idx === 0 || idx === 6 ? 'text-purple-300' : 'text-zinc-200'
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
            const isHovered = hoveredDay === dayStr;

            return (
              <div
                key={dayStr}
                onMouseEnter={() => setHoveredDay(dayStr)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between group relative ${
                  !isCurrentMonth ? 'bg-[#080511]/90 opacity-40' : 'bg-[#141026] hover:bg-[#1a1432]'
                } ${isCurrentDay ? 'ring-2 ring-purple-400 bg-purple-950/40 z-10' : ''}`}
              >
                {/* Day Header: Canto Superior Esquerdo (Dia 01) e Canto Superior Direito (Qtd 05) */}
                <div className="flex items-center justify-between mb-1.5 gap-1">
                  {/* Canto Superior Esquerdo: Dia com 2 dígitos (ex: 01, 02) */}
                  <span
                    className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-mono rounded-lg px-2 py-0.5 transition-all ${
                      isCurrentDay
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950 font-black ring-2 ring-purple-300'
                        : isCurrentMonth
                        ? 'text-white font-extrabold bg-[#1e163b] border-2 border-purple-500/60 shadow-sm'
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
                          ? 'text-zinc-400 bg-purple-950/40 border border-purple-900/60'
                          : 'text-zinc-600'
                      }`}
                      title={`${dayOitivas.length} oitiva(s) no dia ${format(day, 'dd/MM/yyyy')}`}
                    >
                      {String(dayOitivas.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Scheduled Hearings (Oitivas) List: Sem barra de scroll interna, expande a célula para acomodar todos os itens */}
                <div className="flex-1 space-y-1.5 py-1">
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

                    return (
                      <div
                        key={oitiva.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOitiva(oitiva);
                        }}
                        className={`p-1.5 sm:p-2 rounded-xl text-left border-2 cursor-pointer transition-all hover:scale-[1.02] shadow-md ${cardClasses}`}
                        title={`${oitiva.time || ''} - ${oitiva.personName} (${oitiva.role || 'Oitiva'}) • Status: ${oitiva.status} • Clique para ver detalhes`}
                      >
                        {/* Time & Role / Modality Indicator */}
                        <div className="flex items-center justify-between gap-1 text-[10px] leading-none mb-1">
                          <span className="font-black text-white flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5 text-purple-200" />
                            {oitiva.time || '--:--'}
                          </span>
                          <div className="flex items-center gap-1">
                            {oitiva.modality === 'Videoconferência' && (
                              <Video className="w-3 h-3 text-cyan-300 shrink-0" title="Videoconferência" />
                            )}
                            {oitiva.role && (
                              <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-black/60 text-white border border-white/30 truncate max-w-[60px]">
                                {oitiva.role}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* NOME DO DEPOENTE E LEGENDA DO STATUS AO LADO EM FONTE MENOR */}
                        <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                          <p className="text-xs font-black text-white tracking-tight leading-tight truncate flex-1 min-w-[50px]">
                            {firstName}
                          </p>
                          <span className={`text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${statusBadgeClasses}`}>
                            {status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty day prompt on hover */}
                {dayOitivas.length === 0 && isHovered && isCurrentMonth && (
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
          </div>

          <div className="text-xs text-purple-200 font-medium">
            Ambiente Oficial • Pautas dinâmicas e auto-ajustáveis
          </div>
        </div>

      </div>
    </div>
  );
};
