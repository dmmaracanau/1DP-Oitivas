import React from 'react';
import { Calendar, CheckCircle2, Clock, Users, UserX, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();
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
              ? isDark 
                ? 'bg-[#0f244c] border-blue-400 text-white ring-1 ring-blue-300 font-bold'
                : 'bg-blue-100 border-blue-400 text-blue-950 ring-1 ring-blue-300 font-bold'
              : isDark
                ? 'bg-[#0b172e] border-blue-800/60 text-blue-200'
                : 'bg-white border-blue-200 text-blue-950 shadow-sm'
          }`}
        >
          <Users className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className="text-[11px] font-bold">No Mês</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
            isDark ? 'bg-blue-950 text-blue-300 border-blue-500/50' : 'bg-blue-200 text-blue-950 border-blue-300'
          }`}>
            {monthTotal}
          </span>
        </button>

        {/* Chip 2: Pauta Hoje */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 transition-all shrink-0 ${
            monthTodayCount > 0
              ? isDark
                ? 'bg-[#312007] border-amber-400 text-amber-100 ring-1 ring-amber-400/60'
                : 'bg-amber-100 border-amber-400 text-amber-950 ring-1 ring-amber-300 font-bold'
              : isDark
                ? 'bg-[#181105] border-amber-800/50 text-amber-300'
                : 'bg-white border-amber-200 text-amber-950 shadow-sm'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="text-[11px] font-bold">Hoje</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
            isDark ? 'bg-amber-950 text-amber-300 border-amber-500/50' : 'bg-amber-200 text-amber-950 border-amber-300'
          }`}>
            {monthTodayCount}
          </span>
        </div>

        {/* Chip 3: Agendadas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Agendada' ? 'TODOS' : 'Agendada')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Agendada'
              ? isDark
                ? 'bg-[#2f1556] border-purple-400 text-white ring-1 ring-purple-300 font-bold'
                : 'bg-purple-100 border-purple-400 text-purple-950 ring-1 ring-purple-300 font-bold'
              : isDark
                ? 'bg-[#190d30] border-purple-800/60 text-purple-200'
                : 'bg-white border-purple-200 text-purple-950 shadow-sm'
          }`}
        >
          <Calendar className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
          <span className="text-[11px] font-bold">Agendadas</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
            isDark ? 'bg-purple-950 text-purple-300 border-purple-500/50' : 'bg-purple-200 text-purple-950 border-purple-300'
          }`}>
            {monthScheduledCount}
          </span>
        </button>

        {/* Chip 4: Realizadas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Realizada' ? 'TODOS' : 'Realizada')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Realizada'
              ? isDark
                ? 'bg-[#0e3a28] border-emerald-400 text-white ring-1 ring-emerald-300 font-bold'
                : 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300 font-bold'
              : isDark
                ? 'bg-[#071f16] border-emerald-800/60 text-emerald-200'
                : 'bg-white border-emerald-200 text-emerald-950 shadow-sm'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className="text-[11px] font-bold">Realizadas</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
            isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-emerald-200 text-emerald-950 border-emerald-300'
          }`}>
            {monthCompletedCount}
          </span>
        </button>

        {/* Chip 5: Faltas */}
        <button
          type="button"
          onClick={() => onStatusFilterChange(selectedStatusFilter === 'Não Compareceu' ? 'TODOS' : 'Não Compareceu')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border-2 text-left transition-all shrink-0 ${
            selectedStatusFilter === 'Não Compareceu'
              ? isDark
                ? 'bg-[#461223] border-rose-400 text-white ring-1 ring-rose-300 font-bold'
                : 'bg-rose-100 border-rose-400 text-rose-950 ring-1 ring-rose-300 font-bold'
              : isDark
                ? 'bg-[#240a13] border-rose-800/60 text-rose-200'
                : 'bg-white border-rose-200 text-rose-950 shadow-sm'
          }`}
        >
          <UserX className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
          <span className="text-[11px] font-bold">Faltas</span>
          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
            isDark ? 'bg-rose-950 text-rose-300 border-rose-500/50' : 'bg-rose-200 text-rose-950 border-rose-300'
          }`}>
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
              ? isDark
                ? 'bg-[#0f244c] border-blue-400 ring-2 ring-blue-400/70 shadow-lg shadow-blue-950/80 scale-[1.02]'
                : 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md scale-[1.02]'
              : isDark
                ? 'bg-[#0b172e] border-blue-800/60 hover:border-blue-400 hover:bg-[#112347]'
                : 'bg-white border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
          title={`Filtrar todas as oitivas de ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark ? 'bg-blue-950 border-blue-400/80 text-blue-200' : 'bg-blue-100 border-blue-300 text-blue-900'
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                  isDark ? 'text-blue-300' : 'text-blue-950'
                }`}>
                  No Mês
                </span>
                <span className={`text-[8px] font-bold capitalize hidden sm:inline truncate ${
                  isDark ? 'text-blue-400/80' : 'text-blue-700'
                }`}>
                  ({monthShort})
                </span>
              </div>
              <span className={`text-[9px] block font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Todas as Oitivas</span>
            </div>
          </div>
          <span className={`text-base sm:text-lg font-black tracking-tight leading-none shrink-0 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {monthTotal}
          </span>
        </button>

        {/* Botão 2: Oitivas de Hoje no Mês (Âmbar) */}
        <div
          className={`px-3 py-2 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 shadow-sm ${
            monthTodayCount > 0 
              ? isDark
                ? 'bg-[#312007] border-amber-400 ring-1 ring-amber-400/60 shadow-lg shadow-amber-950/70' 
                : 'bg-amber-50 border-amber-400 ring-1 ring-amber-300 shadow-sm'
              : isDark
                ? 'bg-[#181105] border-amber-800/50'
                : 'bg-white border-amber-200'
          }`}
          title="Oitivas agendadas para o dia de hoje"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark ? 'bg-amber-950 border-amber-400/80 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-900'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                isDark ? 'text-amber-300' : 'text-amber-950'
              }`}>
                Pauta Hoje
              </span>
              <span className={`text-[9px] block font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Dia Atual</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-base sm:text-lg font-black tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {monthTodayCount}
            </span>
            {monthTodayCount > 0 && (
              <span className={`text-[8px] font-black px-1 py-0.5 rounded-full uppercase ${
                isDark ? 'text-amber-950 bg-amber-300' : 'text-amber-950 bg-amber-200 border border-amber-400'
              }`}>
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
              ? isDark
                ? 'bg-[#2f1556] border-purple-400 ring-2 ring-purple-400/70 shadow-lg shadow-purple-950/80 scale-[1.02]'
                : 'bg-purple-50 border-purple-400 ring-2 ring-purple-300 shadow-md scale-[1.02]'
              : isDark
                ? 'bg-[#190d30] border-purple-800/60 hover:border-purple-400 hover:bg-[#251244]'
                : 'bg-white border-purple-200 hover:border-purple-400 hover:bg-purple-50/50'
          }`}
          title={`Filtrar oitivas Agendadas em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark ? 'bg-purple-950 border-purple-400/80 text-purple-200' : 'bg-purple-100 border-purple-300 text-purple-900'
            }`}>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                isDark ? 'text-purple-300' : 'text-purple-950'
              }`}>
                Agendadas
              </span>
              <span className={`text-[9px] block font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Pendentes no Mês</span>
            </div>
          </div>
          <span className={`text-base sm:text-lg font-black tracking-tight leading-none shrink-0 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
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
              ? isDark
                ? 'bg-[#0e3a28] border-emerald-400 ring-2 ring-emerald-400/70 shadow-lg shadow-emerald-950/80 scale-[1.02]'
                : 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-md scale-[1.02]'
              : isDark
                ? 'bg-[#071f16] border-emerald-800/60 hover:border-emerald-400 hover:bg-[#0c2f21]'
                : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50'
          }`}
          title={`Filtrar oitivas Realizadas em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark ? 'bg-emerald-950 border-emerald-400/80 text-emerald-200' : 'bg-emerald-100 border-emerald-300 text-emerald-900'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                isDark ? 'text-emerald-300' : 'text-emerald-950'
              }`}>
                Realizadas
              </span>
              <span className={`text-[9px] block font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Concluídas no Mês</span>
            </div>
          </div>
          <span className={`text-base sm:text-lg font-black tracking-tight leading-none shrink-0 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
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
              ? isDark
                ? 'bg-[#461223] border-rose-400 ring-2 ring-rose-400/70 shadow-lg shadow-rose-950/80 scale-[1.02]'
                : 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 shadow-md scale-[1.02]'
              : isDark
                ? 'bg-[#240a13] border-rose-800/60 hover:border-rose-400 hover:bg-[#340f1c]'
                : 'bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/50'
          }`}
          title={`Filtrar faltas e não comparecimentos em ${monthNameFormatted}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${
              isDark ? 'bg-rose-950 border-rose-400/80 text-rose-200' : 'bg-rose-100 border-rose-300 text-rose-900'
            }`}>
              <UserX className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider block truncate ${
                isDark ? 'text-rose-300' : 'text-rose-950'
              }`}>
                Faltas
              </span>
              <span className={`text-[9px] block font-medium ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Não Compareceu</span>
            </div>
          </div>
          <span className={`text-base sm:text-lg font-black tracking-tight leading-none shrink-0 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {monthAbsentCount}
          </span>
        </button>

      </div>
    </div>
  );
};
