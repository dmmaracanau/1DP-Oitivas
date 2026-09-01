import React from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Video, 
  MapPin, 
  FileText, 
  User, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Oitiva, HearingStatus, CalendarSpecialDate } from '../types/oitiva';
import { getRoleBadgeClasses, formatDateBR } from '../utils/formatters';
import { specialDateService } from '../services/specialDateService';
import { OitivaTooltip } from './OitivaTooltip';
import { HolidayTooltip } from './HolidayTooltip';

interface CalendarDayViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  onQuickStatusChange: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextSent: boolean) => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  statusFilter: HearingStatus | 'TODOS';
  specialDates?: CalendarSpecialDate[];
  onOpenHolidaysModal?: (dateStr?: string) => void;
  isAdmin?: boolean;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  oitivas,
  currentDate,
  onDateChange,
  onSelectOitiva,
  onAddOitivaForDate,
  onQuickStatusChange,
  onToggleIntimationSent,
  onOpenWhatsApp,
  statusFilter,
  specialDates = [],
  onOpenHolidaysModal,
  isAdmin = false
}) => {
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const prevDay = () => onDateChange(subDays(currentDate, 1));
  const nextDay = () => onDateChange(addDays(currentDate, 1));

  const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
  const daySpecialDates = specialDateService
    .getSpecialDatesForDate(dayStr, currentDate.getDay(), specialDates)
    .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);

  const dayOitivas = oitivas
    .filter(o => o.date === dayStr)
    .filter(o => statusFilter === 'TODOS' || o.status === statusFilter)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-1 sm:px-2.5 lg:px-4 pb-10">
      <div className={`border-2 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isWeekendDay 
          ? 'bg-[#18080f] border-red-800/80 shadow-red-950/80' 
          : 'bg-[#0e0a1b] border-purple-600/70 shadow-purple-950/80'
      }`}>
        
        {/* Day Header */}
        <div className={`flex flex-col sm:flex-row items-center justify-between p-5 border-b-2 gap-4 ${
          isWeekendDay 
            ? 'border-red-800/60 bg-[#220912]' 
            : 'border-purple-700/60 bg-[#151026]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md ${
              isWeekendDay 
                ? 'bg-red-950 border-red-500/80 text-red-200' 
                : 'bg-purple-950 border-purple-400/80 text-purple-200'
            }`}>
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight capitalize">
                  {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                {isWeekendDay && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-red-950 text-red-300 border border-red-500/70">
                    Fim de Semana (Não Útil)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300 font-medium">
                Pauta Diária • {dayOitivas.length} {dayOitivas.length === 1 ? 'oitiva agendada' : 'oitivas agendadas'}
                {daySpecialDates.length > 0 && ` • ${daySpecialDates.map(x => x.title).join(', ')}`}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenHolidaysModal && onOpenHolidaysModal(dayStr)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2b0c16] hover:bg-[#3d1220] text-red-300 hover:text-white text-xs font-black border-2 border-red-500/70 hover:border-red-400 transition-all cursor-pointer shadow-sm"
                title="Gerenciar Feriados e Fins de Semana"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Feriados</span>
              </button>
            )}

            <button
              onClick={prevDay}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3.5 py-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-white text-xs font-bold border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
            >
              Hoje
            </button>
            <button
              onClick={nextDay}
              className="p-2 rounded-xl bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-2 border-purple-700/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm"
              title="Próximo dia"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onAddOitivaForDate(dayStr)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950/60 border-2 border-purple-400/70 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar</span>
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 space-y-4 bg-[#0c0817]">
          
          {/* SPECIAL DATES / FERIADOS / FINS DE SEMANA BANNER CARD */}
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
                className={`p-4 rounded-2xl bg-[#290812] border-2 border-red-500 text-white shadow-xl flex items-center justify-between gap-4 transition-all ${
                  isAdmin ? 'cursor-pointer hover:border-red-300 hover:bg-[#380b19]' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-red-950 border-2 border-red-500 flex items-center justify-center text-red-300 shadow-md">
                    <Sparkles className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-red-400">
                        {sp.title}
                      </h3>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-red-950 text-red-300 border-2 border-red-500/80">
                        {sp.type === 'fim_de_semana' ? 'Fim de Semana' : sp.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado Oficial'}
                      </span>
                    </div>
                    {sp.description && (
                      <p className="text-xs text-zinc-300 mt-0.5">{sp.description}</p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <span className="text-xs text-red-300 font-bold underline shrink-0">
                    Gerenciar
                  </span>
                )}
              </div>
            </HolidayTooltip>
          ))}

          {dayOitivas.length > 0 ? (
            dayOitivas.map((oitiva) => {
              const status = oitiva.status || 'Agendada';

              // Distinct high-contrast card styling based on status
              let cardClasses = 'bg-[#1e1338] border-2 border-purple-400 text-white hover:border-purple-200 hover:bg-[#281a4b]';
              let statusBadgeClasses = 'bg-purple-950 text-purple-200 border-2 border-purple-400/80';

              if (status === 'Realizada') {
                cardClasses = 'bg-[#062417] border-2 border-emerald-400 text-white hover:border-emerald-200 hover:bg-[#0c3624]';
                statusBadgeClasses = 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400/80';
              } else if (status === 'Não Compareceu') {
                cardClasses = 'bg-[#2f1007] border-2 border-orange-400 text-white hover:border-orange-200 hover:bg-[#43170a]';
                statusBadgeClasses = 'bg-orange-950 text-orange-200 border-2 border-orange-400/80';
              } else if (status === 'Cancelada') {
                cardClasses = 'bg-[#290812] border-2 border-rose-400 text-white hover:border-rose-200 hover:bg-[#3d0c1b]';
                statusBadgeClasses = 'bg-rose-950 text-rose-200 border-2 border-rose-400/80';
              } else if (status === 'Remarcada') {
                cardClasses = 'bg-[#291b05] border-2 border-amber-400 text-white hover:border-amber-200 hover:bg-[#3d2908]';
                statusBadgeClasses = 'bg-amber-950 text-amber-200 border-2 border-amber-400/80';
              }

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
                    className={`p-4 sm:p-5 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group shadow-lg ${cardClasses}`}
                  >
                    <div 
                      onClick={() => onSelectOitiva(oitiva)}
                      className="flex items-start gap-4 flex-1 cursor-pointer"
                    >
                      <div className="px-3.5 py-2.5 rounded-xl bg-black/60 border-2 border-white/30 text-white font-mono font-black text-sm sm:text-base flex items-center gap-1.5 shadow-sm shrink-0">
                        <Clock className="w-4 h-4 text-purple-300" />
                        {oitiva.time || '--:--'}
                      </div>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Name and Status Label next to it */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-white tracking-tight hover:text-purple-200 transition-colors" title={oitiva.personName}>
                            {oitiva.personName}
                          </h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${statusBadgeClasses}`}>
                            {status.toLowerCase()}
                          </span>
                          {oitiva.role && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border-2 ${getRoleBadgeClasses(oitiva.role)}`}>
                              {oitiva.role}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-zinc-200 flex-wrap font-semibold">
                          {oitiva.procedureNumber && (
                            <span className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-md border border-white/20 font-mono font-bold text-white">
                              <FileText className="w-3.5 h-3.5 text-purple-300" />
                              <span>{oitiva.procedureNumber}</span>
                            </span>
                          )}
                          {oitiva.locationOrLink && (
                            <span className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-md border border-white/20">
                              {oitiva.modality === 'Videoconferência' ? (
                                <Video className="w-3.5 h-3.5 text-cyan-300" />
                              ) : (
                                <MapPin className="w-3.5 h-3.5 text-purple-300" />
                              )}
                              <span className="truncate max-w-[200px]">{oitiva.locationOrLink}</span>
                            </span>
                          )}
                          {oitiva.officerName && (
                            <span className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-md border border-white/20">
                              <User className="w-3.5 h-3.5 text-amber-300" />
                              <span className="truncate max-w-[180px]">{oitiva.officerName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10 shrink-0">
                      {oitiva.status !== 'Realizada' && (
                        <button
                          onClick={() => onQuickStatusChange(oitiva.id, 'Realizada')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white border-2 border-emerald-300 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          title="Marcar como Realizada"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Concluir</span>
                        </button>
                      )}
                      {oitiva.status !== 'Não Compareceu' && oitiva.status !== 'Realizada' && (
                        <button
                          onClick={() => onQuickStatusChange(oitiva.id, 'Não Compareceu')}
                          className="px-3 py-1.5 rounded-xl bg-orange-700 hover:bg-orange-600 text-white border-2 border-orange-300 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                          title="Marcar Ausência"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Ausente</span>
                        </button>
                      )}
                      {oitiva.status !== 'Cancelada' && oitiva.status === 'Agendada' && (
                        <button
                          onClick={() => onQuickStatusChange(oitiva.id, 'Cancelada')}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-2 border-rose-500/70 text-xs font-bold transition-all cursor-pointer"
                          title="Cancelar Oitiva"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </OitivaTooltip>
              );
            })
          ) : (
            <div className="py-16 text-center space-y-3">
              <CalendarIcon className="w-12 h-12 mx-auto text-purple-400/60" />
              <p className="text-sm text-zinc-200 font-bold">Nenhuma oitiva agendada para este dia.</p>
              <button
                onClick={() => onAddOitivaForDate(dayStr)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950/60 border-2 border-purple-400/50 cursor-pointer"
              >
                + Agendar Oitiva para Hoje
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
