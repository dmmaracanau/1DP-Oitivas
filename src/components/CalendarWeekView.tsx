import React from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Plus, Video, Calendar as CalendarIcon } from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { getFirstName } from '../utils/formatters';

interface CalendarWeekViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  statusFilter: HearingStatus | 'TODOS';
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  oitivas,
  currentDate,
  onDateChange,
  onSelectOitiva,
  onAddOitivaForDate,
  statusFilter
}) => {
  const start = startOfWeek(currentDate, { weekStartsOn: 0 });
  const end = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });

  const prevWeek = () => onDateChange(subWeeks(currentDate, 1));
  const nextWeek = () => onDateChange(addWeeks(currentDate, 1));

  const filteredOitivas = oitivas.filter(o => {
    if (statusFilter === 'TODOS') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-12">
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 transition-all">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 sm:p-5 border-b border-purple-900/30 bg-[#141021]/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-950/90 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Semana de {format(start, "dd 'de' MMMM", { locale: ptBR })} a {format(end, "dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-300/70">Visão Semanal • Auto-dimensionamento de Pautas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-1.5 sm:p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-200 hover:text-white text-xs font-semibold border border-purple-900/40 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={nextWeek}
              className="p-1.5 sm:p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40 transition-colors cursor-pointer"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 7 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-purple-900/20 bg-[#0b0914] min-h-[420px]">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayOitivas = filteredOitivas.filter(o => o.date === dayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dayStr}
                className={`p-2.5 sm:p-3 flex flex-col justify-between transition-colors ${
                  isCurrentDay ? 'bg-purple-950/20 ring-1 ring-purple-500/60' : 'bg-[#100d1c]/40 hover:bg-[#130f24]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-purple-900/20">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className={`text-sm sm:text-base font-extrabold ${isCurrentDay ? 'text-purple-300' : 'text-white'}`}>
                        {format(day, 'dd/MM')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAddOitivaForDate(dayStr)}
                        className="p-1 text-purple-400 hover:text-white hover:bg-purple-600/30 rounded-lg transition-colors cursor-pointer"
                        title="Adicionar oitiva neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <span
                        className={`inline-flex items-center justify-center font-mono font-bold text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md transition-all ${
                          dayOitivas.length > 0
                            ? 'bg-purple-900/80 border border-purple-500/50 text-purple-200 shadow-sm'
                            : 'text-zinc-600 bg-purple-950/20 border border-purple-950/40'
                        }`}
                        title={`${dayOitivas.length} oitiva(s) agendada(s)`}
                      >
                        {String(dayOitivas.length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Day items */}
                  <div className="space-y-1.5 py-1">
                    {dayOitivas.map((oitiva) => {
                      const isCompleted = oitiva.status === 'Realizada';
                      const isMissed = oitiva.status === 'Não Compareceu';
                      const isCanceled = oitiva.status === 'Cancelada';
                      const firstName = getFirstName(oitiva.personName);

                      return (
                        <div
                          key={oitiva.id}
                          onClick={() => onSelectOitiva(oitiva)}
                          className={`p-2 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                            isCompleted
                              ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/60 text-emerald-200'
                              : isMissed
                              ? 'bg-orange-950/40 border-orange-500/30 hover:border-orange-400/60 text-orange-200'
                              : isCanceled
                              ? 'bg-rose-950/40 border-rose-500/30 hover:border-rose-400/60 text-rose-300 line-through opacity-70'
                              : 'bg-[#1d182e] hover:bg-[#282140] border-purple-500/30 hover:border-purple-400/80 text-zinc-100'
                          }`}
                          title={`${oitiva.time || ''} - ${oitiva.personName} (${oitiva.role || 'Oitiva'})`}
                        >
                          <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="font-bold text-purple-300 font-mono flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-purple-400" />
                              {oitiva.time || '--:--'}
                            </span>
                            <div className="flex items-center gap-1">
                              {oitiva.modality === 'Videoconferência' && (
                                <Video className="w-2.5 h-2.5 text-blue-400" title="Videoconferência" />
                              )}
                              <span className="text-[8px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                                {oitiva.role || 'Oitiva'}
                              </span>
                            </div>
                          </div>
                          {/* Primeiro nome */}
                          <p className="text-xs font-bold text-white tracking-tight leading-snug truncate">
                            {firstName}
                          </p>
                          {oitiva.procedureNumber && (
                            <p className="text-[9px] text-zinc-400 mt-0.5 truncate font-mono">
                              {oitiva.procedureNumber}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {dayOitivas.length === 0 && (
                      <div 
                        onClick={() => onAddOitivaForDate(dayStr)}
                        className="py-5 text-center text-zinc-600 hover:text-purple-400 text-xs border border-dashed border-purple-900/30 hover:border-purple-500/40 rounded-xl cursor-pointer transition-all"
                      >
                        + Agendar
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <span className="text-[9px] text-zinc-500 font-medium">
                    {dayOitivas.length} {dayOitivas.length === 1 ? 'oitiva' : 'oitivas'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
