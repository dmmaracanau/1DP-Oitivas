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
import { SwipeableOitivaCard } from './SwipeableOitivaCard';
import { useSwipeGesture } from '../utils/useSwipeGesture';
import { hapticSelection, hapticSwipe, hapticToggle } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

interface CalendarDayViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  onQuickStatusChange: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextSent: boolean) => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  onDeleteOitiva?: (id: string) => Promise<void> | void;
  onRescheduleOitiva?: (id: string, newDate: string, newTime: string, reason?: string) => Promise<void> | void;
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
  onDeleteOitiva,
  onRescheduleOitiva,
  statusFilter,
  specialDates = [],
  onOpenHolidaysModal,
  isAdmin = false
}) => {
  const { isDark } = useTheme();
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const prevDay = () => {
    hapticSwipe();
    onDateChange(subDays(currentDate, 1));
  };
  const nextDay = () => {
    hapticSwipe();
    onDateChange(addDays(currentDate, 1));
  };

  const mobileSwipeHandlers = useSwipeGesture({
    onSwipeLeft: nextDay,
    onSwipeRight: prevDay,
    minDistance: 45,
    maxVerticalOffset: 75,
  });

  const isWeekendDay = currentDate.getDay() === 0 || currentDate.getDay() === 6;
  const daySpecialDates = specialDateService
    .getSpecialDatesForDate(dayStr, currentDate.getDay(), specialDates)
    .filter(sp => sp.type !== 'fim_de_semana' && !sp.isRecurringWeekend);

  const dayOitivas = oitivas
    .filter(o => o.date === dayStr)
    .filter(o => statusFilter === 'TODOS' || o.status === statusFilter)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div 
      className="w-full max-w-5xl 2xl:max-w-6xl mx-auto px-1 sm:px-2.5 lg:px-4 pb-10 touch-pan-y select-none"
      {...mobileSwipeHandlers}
    >
      <div className={`border-2 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isWeekendDay 
          ? (isDark ? 'bg-[#18080f] border-red-800/80 shadow-red-950/80' : 'bg-rose-50/40 border-rose-200 shadow-slate-200')
          : (isDark ? 'bg-[#0e0a1b] border-purple-600/70 shadow-purple-950/80' : 'bg-white border-purple-200 shadow-slate-200')
      }`}>
        
        {/* Day Header */}
        <div className={`flex flex-col sm:flex-row items-center justify-between p-5 border-b-2 gap-4 ${
          isWeekendDay 
            ? (isDark ? 'border-red-800/60 bg-[#220912]' : 'border-rose-200 bg-rose-50')
            : (isDark ? 'border-purple-700/60 bg-[#151026]' : 'border-slate-200 bg-slate-50')
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md ${
              isWeekendDay 
                ? (isDark ? 'bg-red-950 border-red-500/80 text-red-200' : 'bg-rose-100 border-rose-300 text-rose-800')
                : (isDark ? 'bg-purple-950 border-purple-400/80 text-purple-200' : 'bg-purple-100 border-purple-300 text-purple-800')
            }`}>
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight capitalize ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h2>
                {isWeekendDay && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    isDark 
                      ? 'bg-red-950 text-red-300 border border-red-500/70' 
                      : 'bg-rose-100 text-rose-950 border border-rose-300'
                  }`}>
                    Fim de Semana (Não Útil)
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer shadow-sm ${
                  isDark 
                    ? 'bg-[#2b0c16] hover:bg-[#3d1220] text-red-300 hover:text-white border-red-500/70 hover:border-red-400' 
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 hover:border-rose-400'
                }`}
                title="Gerenciar Feriados e Fins de Semana"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Feriados</span>
              </button>
            )}

            <button
              onClick={prevDay}
              className={`p-2 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-purple-300'
              }`}
              title="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 hover:border-purple-400 font-black'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={nextDay}
              className={`p-2 rounded-xl border-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-[#1d1633] hover:bg-[#2a204a] text-zinc-200 hover:text-white border-purple-700/60 hover:border-purple-400' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-purple-300'
              }`}
              title="Próximo dia"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onAddOitivaForDate(dayStr)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-md border-2 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/60 border-purple-400/70' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Agendar</span>
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className={`p-6 space-y-4 ${isDark ? 'bg-[#0c0817]' : 'bg-slate-50'}`}>
          
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
                className={`p-4 rounded-2xl border-2 shadow-xl flex items-center justify-between gap-4 transition-all ${
                  isDark 
                    ? 'bg-[#290812] border-red-500 text-white' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                } ${
                  isAdmin ? 'cursor-pointer hover:scale-[1.01]' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-md ${
                    isDark 
                      ? 'bg-red-950 border-red-500 text-red-300' 
                      : 'bg-rose-100 border-rose-300 text-rose-700'
                  }`}>
                    <Sparkles className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-rose-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-base font-black ${isDark ? 'text-red-400' : 'text-rose-950'}`}>
                        {sp.title}
                      </h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border-2 ${
                        isDark 
                          ? 'bg-red-950 text-red-300 border-red-500/80' 
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {sp.type === 'fim_de_semana' ? 'Fim de Semana' : sp.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado Oficial'}
                      </span>
                    </div>
                    {sp.description && (
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{sp.description}</p>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <span className={`text-xs font-bold underline shrink-0 ${isDark ? 'text-red-300' : 'text-rose-700'}`}>
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
              let cardClasses = isDark 
                ? 'bg-[#1e1338] border-2 border-purple-400 text-white hover:border-purple-200 hover:bg-[#281a4b]'
                : 'bg-white border-2 border-purple-300 text-slate-900 hover:border-purple-500 hover:bg-purple-50/50 shadow-md';
              let statusBadgeClasses = isDark 
                ? 'bg-purple-950 text-purple-200 border-2 border-purple-400/80'
                : 'bg-purple-100 text-purple-950 border border-purple-300 font-bold';

              if (status === 'Realizada') {
                cardClasses = isDark 
                  ? 'bg-[#062417] border-2 border-emerald-400 text-white hover:border-emerald-200 hover:bg-[#0c3624]'
                  : 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950 hover:border-emerald-600 hover:bg-emerald-100/80 shadow-md';
                statusBadgeClasses = isDark 
                  ? 'bg-emerald-950 text-emerald-200 border-2 border-emerald-400/80'
                  : 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold';
              } else if (status === 'Não Compareceu') {
                cardClasses = isDark 
                  ? 'bg-[#2f1007] border-2 border-orange-400 text-white hover:border-orange-200 hover:bg-[#43170a]'
                  : 'bg-orange-50 border-2 border-orange-400 text-orange-950 hover:border-orange-600 hover:bg-orange-100/80 shadow-md';
                statusBadgeClasses = isDark 
                  ? 'bg-orange-950 text-orange-200 border-2 border-orange-400/80'
                  : 'bg-orange-100 text-orange-950 border border-orange-300 font-bold';
              } else if (status === 'Cancelada') {
                cardClasses = isDark 
                  ? 'bg-[#290812] border-2 border-rose-400 text-white hover:border-rose-200 hover:bg-[#3d0c1b]'
                  : 'bg-rose-50 border-2 border-rose-300 text-rose-950 line-through opacity-85 hover:bg-rose-100 shadow-md';
                statusBadgeClasses = isDark 
                  ? 'bg-rose-950 text-rose-200 border-2 border-rose-400/80'
                  : 'bg-rose-100 text-rose-950 border border-rose-300 font-bold no-underline';
              } else if (status === 'Remarcada') {
                cardClasses = isDark 
                  ? 'bg-[#291b05] border-2 border-amber-400 text-white hover:border-amber-200 hover:bg-[#3d2908]'
                  : 'bg-amber-50 border-2 border-amber-400 text-amber-950 hover:border-amber-600 hover:bg-amber-100/80 shadow-md';
                statusBadgeClasses = isDark 
                  ? 'bg-amber-950 text-amber-200 border-2 border-amber-400/80'
                  : 'bg-amber-100 text-amber-950 border border-amber-300 font-bold';
              }

              return (
                <React.Fragment key={oitiva.id}>
                  {/* Visualização Mobile com Swipe Horizontal */}
                  <div className="sm:hidden">
                    <SwipeableOitivaCard
                      oitiva={oitiva}
                      onSelectOitiva={onSelectOitiva}
                      onQuickStatusChange={onQuickStatusChange}
                      onToggleIntimationSent={onToggleIntimationSent}
                      onOpenWhatsApp={onOpenWhatsApp}
                      onDeleteOitiva={onDeleteOitiva}
                      onRescheduleOitiva={onRescheduleOitiva}
                    />
                  </div>

                  {/* Visualização Desktop */}
                  <div className="hidden sm:block">
                    <OitivaTooltip
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
                          <div 
                            className={`px-4 py-2.5 rounded-2xl border-2 font-mono font-black text-base sm:text-lg flex items-center gap-2 shadow-md shrink-0 tracking-wide ring-2 ${
                              isDark 
                                ? 'bg-black/85 border-amber-400/80 text-amber-300 ring-black/40' 
                                : 'bg-amber-100 border-amber-400 text-amber-950 ring-amber-200'
                            }`}
                            title={`Horário marcado: ${oitiva.time || 'Não definido'}`}
                          >
                            <Clock className={`w-4.5 h-4.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
                            <span>{oitiva.time || '--:--'}</span>
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            {/* Name and Status Label next to it */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className={`text-base font-black tracking-tight transition-colors ${
                                isDark ? 'text-white hover:text-purple-200' : 'text-slate-900 hover:text-purple-900'
                              }`} title={oitiva.personName}>
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

                            <div className={`flex items-center gap-3 text-xs flex-wrap font-semibold ${
                              isDark ? 'text-zinc-200' : 'text-slate-700'
                            }`}>
                              {oitiva.procedureNumber && (
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono font-bold ${
                                  isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}>
                                  <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                                  <span>{oitiva.procedureNumber}</span>
                                </span>
                              )}
                              {oitiva.locationOrLink && (
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                                  isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}>
                                  {oitiva.modality === 'Videoconferência' ? (
                                    <Video className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} />
                                  ) : (
                                    <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                                  )}
                                  <span className="truncate max-w-[200px]">{oitiva.locationOrLink}</span>
                                </span>
                              )}
                              {oitiva.officerName && (
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                                  isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}>
                                  <User className={`w-3.5 h-3.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
                                  <span className="truncate max-w-[180px]">{oitiva.officerName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Status Buttons */}
                        <div className={`flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 shrink-0 ${
                          isDark ? 'border-white/10' : 'border-slate-200'
                        }`}>
                          {oitiva.status !== 'Realizada' && (
                            <button
                              onClick={() => onQuickStatusChange(oitiva.id, 'Realizada')}
                              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                isDark 
                                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-300' 
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-400 font-black'
                              }`}
                              title="Marcar como Realizada"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Concluir</span>
                            </button>
                          )}
                          {oitiva.status !== 'Não Compareceu' && oitiva.status !== 'Realizada' && (
                            <button
                              onClick={() => onQuickStatusChange(oitiva.id, 'Não Compareceu')}
                              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                                isDark 
                                  ? 'bg-orange-700 hover:bg-orange-600 text-white border-orange-300' 
                                  : 'bg-orange-100 hover:bg-orange-200 text-orange-950 border-orange-400 font-black'
                              }`}
                              title="Marcar Ausência"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Ausente</span>
                            </button>
                          )}
                          {oitiva.status !== 'Cancelada' && oitiva.status === 'Agendada' && (
                            <button
                              onClick={() => onQuickStatusChange(oitiva.id, 'Cancelada')}
                              className={`px-2.5 py-1.5 rounded-xl border-2 text-xs transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-500/70 font-bold' 
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-400 font-black'
                              }`}
                              title="Cancelar Oitiva"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </OitivaTooltip>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="py-16 text-center space-y-3">
              <CalendarIcon className={`w-12 h-12 mx-auto ${isDark ? 'text-purple-400/60' : 'text-purple-600/60'}`} />
              <p className={`text-sm font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                Nenhuma oitiva agendada para este dia.
              </p>
              <button
                onClick={() => onAddOitivaForDate(dayStr)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md border-2 cursor-pointer ${
                  isDark 
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/60 border-purple-400/50' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700'
                }`}
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
