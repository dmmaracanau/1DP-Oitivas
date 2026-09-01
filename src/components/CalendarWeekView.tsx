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
import { ChevronLeft, ChevronRight, Clock, Plus, Video, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { Oitiva, HearingStatus, CalendarSpecialDate } from '../types/oitiva';
import { getFirstName } from '../utils/formatters';
import { specialDateService } from '../services/specialDateService';
import { OitivaTooltip } from './OitivaTooltip';
import { HolidayTooltip } from './HolidayTooltip';

interface CalendarWeekViewProps {
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

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
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
  const [draggedOitivaId, setDraggedOitivaId] = React.useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = React.useState<string | null>(null);

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
    <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto px-1 sm:px-2.5 lg:px-4 pb-10">
      <div className="bg-[#0e0a1b] border-2 border-purple-600/70 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/80 transition-all">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 border-b-2 border-purple-700/60 bg-[#151026] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 border-2 border-purple-400/80 flex items-center justify-center text-purple-200 shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Semana de {format(start, "dd 'de' MMMM", { locale: ptBR })} a {format(end, "dd 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-300 font-medium">Visão Semanal • Pautas, Feriados e Fins de Semana</p>
            </div>
          </div>

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
              onClick={prevWeek}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3.5 py-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-white text-xs font-bold border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
            >
              Hoje
            </button>
            <button
              onClick={nextWeek}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 7 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 divide-y-2 md:divide-y-0 md:divide-x-2 divide-purple-700/50 bg-[#0c0817] min-h-[420px]">
          {days.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayOitivas = filteredOitivas.filter(o => o.date === dayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const daySpecialDates = specialDateService
              .getSpecialDatesForDate(dayStr, day.getDay(), specialDates)
              .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);
            const isCurrentDay = isToday(day);
            const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;
            const isDragTarget = dragOverDay === dayStr;

            return (
              <div
                key={dayStr}
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
                className={`p-2.5 sm:p-3 flex flex-col justify-between transition-all relative ${
                  isDragTarget
                    ? 'ring-4 ring-purple-400 bg-purple-900/60 shadow-2xl scale-[1.01] z-20'
                    : isCurrentDay 
                    ? 'bg-purple-950/40 ring-2 ring-purple-400 z-10' 
                    : isWeekendDay 
                    ? 'bg-[#220710] hover:bg-[#2c0a15]' 
                    : 'bg-[#141026] hover:bg-[#1a1432]'
                }`}
              >
                {isDragTarget && (
                  <div className="absolute inset-0 bg-purple-600/30 border-2 border-dashed border-purple-300 rounded-xl flex items-center justify-center pointer-events-none z-30 backdrop-blur-[2px]">
                    <span className="text-[11px] font-black text-white bg-purple-950/90 px-2 py-1 rounded-lg border border-purple-400 shadow-lg">
                      Mover p/ {format(day, 'dd/MM')}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-purple-700/40">
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-wider ${isWeekendDay ? 'text-red-400' : 'text-purple-300'}`}>
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className={`text-base font-black ${isCurrentDay ? 'text-purple-200' : isWeekendDay ? 'text-red-300' : 'text-white'}`}>
                        {format(day, 'dd/MM')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAddOitivaForDate(dayStr)}
                        className="p-1 text-purple-300 hover:text-white hover:bg-purple-600 rounded-lg transition-colors cursor-pointer border border-purple-400/50"
                        title="Adicionar oitiva neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <span
                        className={`inline-flex items-center justify-center font-mono font-black text-[10px] sm:text-xs px-2 py-0.5 rounded-md transition-all ${
                          dayOitivas.length > 0
                            ? 'bg-purple-900 text-white border-2 border-purple-400 shadow-sm'
                            : isWeekendDay
                            ? 'text-red-400/80 bg-[#340b17]/60 border border-red-900/60'
                            : 'text-zinc-400 bg-purple-950/40 border border-purple-900/60'
                        }`}
                        title={`${dayOitivas.length} oitiva(s) agendada(s)`}
                      >
                        {String(dayOitivas.length).padStart(2, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Day items (Special Dates / Feriados + Oitivas) */}
                  <div className="space-y-1.5 py-1">
                    
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
                          onClick={() => {
                            if (isAdmin && onOpenHolidaysModal) {
                              onOpenHolidaysModal(dayStr);
                            }
                          }}
                          className={`p-1.5 sm:p-2 rounded-xl text-left border-2 transition-all shadow-md bg-[#240810] border-red-500 text-white ${
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

                      // Definir estilo de cor de fundo e borda destacada conforme o status
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
                            {/* Linha Superior: Horário + Modalidade + Status Badge */}
                            <div className="flex items-center justify-between gap-1 text-[10px] leading-none mb-1">
                              <span className="font-black text-white flex items-center gap-1 font-mono shrink-0">
                                <Clock className="w-2.5 h-2.5 text-purple-200" />
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

                    {dayOitivas.length === 0 && daySpecialDates.length === 0 && (
                      <div 
                        onClick={() => onAddOitivaForDate(dayStr)}
                        className="py-6 text-center text-purple-300 font-bold hover:text-white text-xs border-2 border-dashed border-purple-700/50 hover:border-purple-400 bg-purple-950/20 hover:bg-purple-950/40 rounded-xl cursor-pointer transition-all"
                      >
                        + Agendar
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px]">
                  {daySpecialDates.length > 0 ? (
                    <span className="text-red-400 font-bold">
                      {daySpecialDates.length === 1 ? daySpecialDates[0].title : `${daySpecialDates.length} marcas`}
                    </span>
                  ) : <span></span>}
                  <span className="text-zinc-400 font-bold">
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

