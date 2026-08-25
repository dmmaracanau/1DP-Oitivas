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
  AlertCircle
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { getRoleBadgeClasses, formatDateBR } from '../utils/formatters';

interface CalendarDayViewProps {
  oitivas: Oitiva[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onAddOitivaForDate: (dateStr: string) => void;
  onQuickStatusChange: (id: string, newStatus: HearingStatus) => void;
  statusFilter: HearingStatus | 'TODOS';
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  oitivas,
  currentDate,
  onDateChange,
  onSelectOitiva,
  onAddOitivaForDate,
  onQuickStatusChange,
  statusFilter
}) => {
  const dayStr = format(currentDate, 'yyyy-MM-dd');
  const prevDay = () => onDateChange(subDays(currentDate, 1));
  const nextDay = () => onDateChange(addDays(currentDate, 1));

  const dayOitivas = oitivas
    .filter(o => o.date === dayStr)
    .filter(o => statusFilter === 'TODOS' || o.status === statusFilter)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 pb-12">
      <div className="bg-[#0e0a1b] border-2 border-purple-600/70 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/80">
        
        {/* Day Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-b-2 border-purple-700/60 bg-[#151026] gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 border-2 border-purple-400/80 flex items-center justify-center text-purple-200 shadow-md">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight capitalize">
                {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <p className="text-xs text-purple-300 font-medium">
                Pauta Diária • {dayOitivas.length} {dayOitivas.length === 1 ? 'oitiva agendada' : 'oitivas agendadas'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
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
                <div
                  key={oitiva.id}
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
                  </div>
                </div>
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
