import React from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Video, 
  MapPin, 
  Phone, 
  FileText, 
  User, 
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { getRoleBadgeClasses, getStatusBadgeClasses, formatDateBR } from '../utils/formatters';

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
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80">
        
        {/* Day Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-5 border-b border-purple-900/30 bg-[#141021]/70 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight capitalize">
                {format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <p className="text-xs text-purple-300/70">
                Pauta Diária • {dayOitivas.length} {dayOitivas.length === 1 ? 'oitiva agendada' : 'oitivas agendadas'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
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
              onClick={nextDay}
              className="p-2 rounded-xl bg-[#1a152b] hover:bg-[#251e3d] text-zinc-300 hover:text-white border border-purple-900/40"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onAddOitivaForDate(dayStr)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-900/40"
            >
              <Plus className="w-4 h-4" />
              <span>Agendar</span>
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 space-y-4 bg-[#0c0a15]">
          {dayOitivas.length > 0 ? (
            dayOitivas.map((oitiva) => (
              <div
                key={oitiva.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#151124] border border-purple-900/40 hover:border-purple-500/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div 
                  onClick={() => onSelectOitiva(oitiva)}
                  className="flex items-start gap-4 flex-1 cursor-pointer"
                >
                  <div className="px-3 py-2 rounded-xl bg-[#1d1630] border border-purple-500/30 text-purple-300 font-mono font-bold text-sm sm:text-base flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-4 h-4 text-purple-400" />
                    {oitiva.time || '--:--'}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white tracking-tight hover:text-purple-300 transition-colors">
                        {oitiva.personName}
                      </h3>
                      {oitiva.role && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClasses(oitiva.role)}`}>
                          {oitiva.role}
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(oitiva.status)}`}>
                        {oitiva.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                      {oitiva.procedureNumber && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-zinc-500" />
                          {oitiva.procedureNumber}
                        </span>
                      )}
                      {oitiva.locationOrLink && (
                        <span className="flex items-center gap-1">
                          {oitiva.modality === 'Videoconferência' ? (
                            <Video className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-purple-400" />
                          )}
                          {oitiva.locationOrLink}
                        </span>
                      )}
                      {oitiva.officerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          {oitiva.officerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-purple-900/20">
                  {oitiva.status !== 'Realizada' && (
                    <button
                      onClick={() => onQuickStatusChange(oitiva.id, 'Realizada')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Marcar como Realizada"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluir</span>
                    </button>
                  )}
                  {oitiva.status !== 'Não Compareceu' && oitiva.status !== 'Realizada' && (
                    <button
                      onClick={() => onQuickStatusChange(oitiva.id, 'Não Compareceu')}
                      className="px-2.5 py-1.5 rounded-lg bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Marcar Ausência"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Ausente</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center space-y-3">
              <CalendarIcon className="w-12 h-12 mx-auto text-purple-500/30" />
              <p className="text-sm text-zinc-400 font-medium">Nenhuma oitiva agendada para este dia.</p>
              <button
                onClick={() => onAddOitivaForDate(dayStr)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-900/40"
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
