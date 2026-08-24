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
import { ChevronLeft, ChevronRight, Clock, Plus, Video, FileText, User } from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';

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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-purple-900/30 bg-[#141021]/70">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Semana de {format(start, "dd 'de' MMMM", { locale: ptBR })} a {format(end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <p className="text-xs text-purple-300/70">Visão Semanal de Oitivas</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 py-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-200 text-xs font-semibold border border-purple-900/40"
            >
              Hoje
            </button>
            <button
              onClick={nextWeek}
              className="p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-purple-900/20 bg-[#0b0914] min-h-[500px]">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayOitivas = filteredOitivas.filter(o => o.date === dayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dayStr}
                className={`p-3 flex flex-col justify-between ${
                  isCurrentDay ? 'bg-purple-950/20 ring-1 ring-purple-500/50' : 'bg-[#100d1c]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-purple-900/20">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className={`text-base font-bold ${isCurrentDay ? 'text-purple-300' : 'text-white'}`}>
                        {format(day, 'dd/MM')}
                      </p>
                    </div>
                    <button
                      onClick={() => onAddOitivaForDate(dayStr)}
                      className="p-1 text-purple-400 hover:text-white hover:bg-purple-600/30 rounded-lg transition-colors"
                      title="Adicionar oitiva neste dia"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day items */}
                  <div className="space-y-2">
                    {dayOitivas.map((oitiva) => (
                      <div
                        key={oitiva.id}
                        onClick={() => onSelectOitiva(oitiva)}
                        className="p-2.5 rounded-xl bg-[#1d182e] hover:bg-[#282140] border border-purple-500/30 hover:border-purple-400/80 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-purple-300 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-400" />
                            {oitiva.time || '--:--'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                            {oitiva.role || 'Oitiva'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white tracking-tight leading-snug">
                          {oitiva.personName}
                        </p>
                        {oitiva.procedureNumber && (
                          <p className="text-[10px] text-zinc-400 mt-1 truncate">
                            {oitiva.procedureNumber}
                          </p>
                        )}
                      </div>
                    ))}

                    {dayOitivas.length === 0 && (
                      <div 
                        onClick={() => onAddOitivaForDate(dayStr)}
                        className="py-8 text-center text-zinc-600 hover:text-purple-400 text-xs border border-dashed border-purple-900/30 hover:border-purple-500/40 rounded-xl cursor-pointer transition-all"
                      >
                        + Agendar
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <span className="text-[10px] text-zinc-500 font-medium">
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
