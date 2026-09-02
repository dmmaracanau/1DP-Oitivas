import React from 'react';
import { Calendar, CheckCircle2, Clock, Users, UserX, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Oitiva, HearingStatus } from '../types/oitiva';

interface StatsBarProps {
  oitivas: Oitiva[];
  currentDate?: Date;
  selectedStatusFilter: HearingStatus | 'TODOS';
  onStatusFilterChange: (status: HearingStatus | 'TODOS') => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  oitivas,
  currentDate = new Date(),
  selectedStatusFilter,
  onStatusFilterChange
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Identificação do ano e mês atuais selecionados na visualização
  const viewYear = currentDate.getFullYear();
  const viewMonth = currentDate.getMonth(); // 0-indexed

  // Nome do mês formatado em português (ex: "Setembro de 2026")
  const monthNameFormatted = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  const monthShort = format(currentDate, "MMM/yy", { locale: ptBR });

  // FILTRO POR MÊS DA VISUALIZAÇÃO:
  // Isola apenas os dados de oitiva pertencentes ao mês e ano da visualização atual
  const monthOitivas = oitivas.filter((o) => {
    if (!o.date) return false;
    const parts = o.date.split('-');
    if (parts.length < 2) return false;
    const oYear = parseInt(parts[0], 10);
    const oMonth = parseInt(parts[1], 10) - 1; // 0-indexed
    return oYear === viewYear && oMonth === viewMonth;
  });

  // Métricas calculadas para o mês específico em exibição
  const monthTotal = monthOitivas.length;
  const monthTodayCount = monthOitivas.filter(o => o.date === todayStr).length;
  const monthScheduledCount = monthOitivas.filter(o => o.status === 'Agendada').length;
  const monthCompletedCount = monthOitivas.filter(o => o.status === 'Realizada').length;
  const monthAbsentCount = monthOitivas.filter(o => o.status === 'Não Compareceu').length;

  return (
    <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto px-1 sm:px-2.5 lg:px-4 py-1 sm:py-1.5 no-print">
      
      {/* --------------------------------------------------------------------- */}
      {/* MOBILE COMPACT FILTER CHIPS STRIP (sm:hidden) - Zero Bloat (~36px)    */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        
        {/* Chip 1: Todas no Mês */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('TODOS')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'TODOS'
              ? 'bg-[#0f244c] border-blue-400 text-white ring-1 ring-blue-300 font-bold'
              : 'bg-[#0b172e] border-blue-800/60 text-blue-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-bold">No Mês</span>
          <span className="text-[10px] font-black bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded-md border border-blue-500/50">
            {monthTotal}
          </span>
        </button>

        {/* Chip 2: Pauta Hoje */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 transition-all shrink-0 ${
            monthTodayCount > 0
              ? 'bg-[#312007] border-amber-400 text-amber-100 ring-1 ring-amber-400/60'
              : 'bg-[#181105] border-amber-800/50 text-amber-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-bold">Hoje</span>
          <span className="text-[10px] font-black bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded-md border border-amber-500/50">
            {monthTodayCount}
          </span>
        </div>

        {/* Chip 3: Agendadas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Agendada' ? 'TODOS' : 'Agendada')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Agendada'
              ? 'bg-[#2f1556] border-purple-400 text-white ring-1 ring-purple-300 font-bold'
              : 'bg-[#190d30] border-purple-800/60 text-purple-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] font-bold">Agendadas</span>
          <span className="text-[10px] font-black bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded-md border border-purple-500/50">
            {monthScheduledCount}
          </span>
        </button>

        {/* Chip 4: Realizadas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Realizada' ? 'TODOS' : 'Realizada')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Realizada'
              ? 'bg-[#0e3a28] border-emerald-400 text-white ring-1 ring-emerald-300 font-bold'
              : 'bg-[#071f16] border-emerald-800/60 text-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold">Realizadas</span>
          <span className="text-[10px] font-black bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded-md border border-emerald-500/50">
            {monthCompletedCount}
          </span>
        </button>

        {/* Chip 5: Faltas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Não Compareceu' ? 'TODOS' : 'Não Compareceu')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Não Compareceu'
              ? 'bg-[#461223] border-rose-400 text-white ring-1 ring-rose-300 font-bold'
              : 'bg-[#240a13] border-rose-800/60 text-rose-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-bold">Faltas</span>
          <span className="text-[10px] font-black bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded-md border border-rose-500/50">
            {monthAbsentCount}
          </span>
        </button>

      </div>

      {/* --------------------------------------------------------------------- */}
      {/* DESKTOP METRICS GRID (hidden sm:grid) - 100% PRESERVED                  */}
      {/* --------------------------------------------------------------------- */}
      <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5">
        
        {/* Botão 1: Total do Mês (Azul) */}
        <button
          id="filter-btn-todas-mes"
          type="button"
          onClick={() => onStatusFilterChange('TODOS')}
          className={`px-3 py-2 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'TODOS'
              ? 'bg-[#0f244c] border-blue-400 ring-2 ring-blue-400/70 shadow-lg shadow-blue-950/80 scale-[1.02]'
              : 'bg-[#0b172e] border-blue-800/60 hover:border-blue-400 hover:bg-[#112347]'
          }`}
          title={`Filtrar todas as oitivas de ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-blue-950 border border-blue-400/80 flex items-center justify-center text-blue-200 shrink-0 shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider block truncate">
                  No Mês
                </span>
                <span className="text-[8px] font-bold text-blue-400/80 capitalize hidden sm:inline truncate">
                  ({monthShort})
                </span>
              </div>
              <span className="text-[9px] text-zinc-400 block font-medium">Todas as Oitivas</span>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none shrink-0">
            {monthTotal}
          </span>
        </button>

        {/* Botão 2: Oitivas de Hoje no Mês (Âmbar) */}
        <div
          className={`px-3 py-2 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 shadow-sm ${
            monthTodayCount > 0 
              ? 'bg-[#312007] border-amber-400 ring-1 ring-amber-400/60 shadow-lg shadow-amber-950/70' 
              : 'bg-[#181105] border-amber-800/50'
          }`}
          title="Oitivas agendadas para o dia de hoje"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-amber-950 border border-amber-400/80 flex items-center justify-center text-amber-200 shrink-0 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block truncate">
                Pauta Hoje
              </span>
              <span className="text-[9px] text-zinc-400 block font-medium">Dia Atual</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
              {monthTodayCount}
            </span>
            {monthTodayCount > 0 && (
              <span className="text-[8px] font-black text-amber-950 bg-amber-300 px-1 py-0.5 rounded-full uppercase">
                Hoje
              </span>
            )}
          </div>
        </div>

        {/* Botão 3: Agendadas no Mês (Roxo) */}
        <button
          id="filter-btn-agendadas-mes"
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Agendada' ? 'TODOS' : 'Agendada')}
          className={`px-3 py-2 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'Agendada'
              ? 'bg-[#2f1556] border-purple-400 ring-2 ring-purple-400/70 shadow-lg shadow-purple-950/80 scale-[1.02]'
              : 'bg-[#190d30] border-purple-800/60 hover:border-purple-400 hover:bg-[#251244]'
          }`}
          title={`Filtrar oitivas Agendadas em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-purple-950 border border-purple-400/80 flex items-center justify-center text-purple-200 shrink-0 shadow-sm">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider block truncate">
                Agendadas
              </span>
              <span className="text-[9px] text-zinc-400 block font-medium">Pendentes no Mês</span>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none shrink-0">
            {monthScheduledCount}
          </span>
        </button>

        {/* Botão 4: Realizadas no Mês (Verde Esmeralda) */}
        <button
          id="filter-btn-realizadas-mes"
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Realizada' ? 'TODOS' : 'Realizada')}
          className={`px-3 py-2 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'Realizada'
              ? 'bg-[#0e3a28] border-emerald-400 ring-2 ring-emerald-400/70 shadow-lg shadow-emerald-950/80 scale-[1.02]'
              : 'bg-[#071f16] border-emerald-800/60 hover:border-emerald-400 hover:bg-[#0c2f21]'
          }`}
          title={`Filtrar oitivas Realizadas em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-950 border border-emerald-400/80 flex items-center justify-center text-emerald-200 shrink-0 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block truncate">
                Realizadas
              </span>
              <span className="text-[9px] text-zinc-400 block font-medium">Concluídas no Mês</span>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none shrink-0">
            {monthCompletedCount}
          </span>
        </button>

        {/* Botão 5: Não Compareceu / Faltas no Mês (Rosa / Carmim) */}
        <button
          id="filter-btn-faltas-mes"
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Não Compareceu' ? 'TODOS' : 'Não Compareceu')}
          className={`px-3 py-2 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'Não Compareceu'
              ? 'bg-[#461223] border-rose-400 ring-2 ring-rose-400/70 shadow-lg shadow-rose-950/80 scale-[1.02]'
              : 'bg-[#240a13] border-rose-800/60 hover:border-rose-400 hover:bg-[#340f1c]'
          }`}
          title={`Filtrar faltas e não comparecimentos em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-rose-950 border border-rose-400/80 flex items-center justify-center text-rose-200 shrink-0 shadow-sm">
              <UserX className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-rose-300 uppercase tracking-wider block truncate">
                Faltas
              </span>
              <span className="text-[9px] text-zinc-400 block font-medium">Não Compareceu</span>
            </div>
          </div>
          <span className="text-base sm:text-lg font-black text-white tracking-tight leading-none shrink-0">
            {monthAbsentCount}
          </span>
        </button>

      </div>
    </div>
  );
};
