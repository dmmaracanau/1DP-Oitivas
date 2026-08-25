import React from 'react';
import { Calendar, CheckCircle2, AlertCircle, Clock, Users, UserX, Filter } from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';

interface StatsBarProps {
  oitivas: Oitiva[];
  selectedStatusFilter: HearingStatus | 'TODOS';
  onStatusFilterChange: (status: HearingStatus | 'TODOS') => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  oitivas,
  selectedStatusFilter,
  onStatusFilterChange
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const total = oitivas.length;
  const todayCount = oitivas.filter(o => o.date === todayStr).length;
  const scheduledCount = oitivas.filter(o => o.status === 'Agendada').length;
  const completedCount = oitivas.filter(o => o.status === 'Realizada').length;
  const absentCount = oitivas.filter(o => o.status === 'Não Compareceu').length;

  const filters: { 
    label: string; 
    value: HearingStatus | 'TODOS'; 
    count: number; 
    activeBg: string;
    activeBorder: string;
    badgeBg: string;
  }[] = [
    { 
      label: 'Todas as Oitivas', 
      value: 'TODOS', 
      count: total, 
      activeBg: 'bg-blue-600/90 text-white',
      activeBorder: 'border-blue-400 shadow-blue-950/70',
      badgeBg: 'bg-blue-950 text-blue-200'
    },
    { 
      label: 'Agendadas', 
      value: 'Agendada', 
      count: scheduledCount, 
      activeBg: 'bg-purple-600/90 text-white',
      activeBorder: 'border-purple-400 shadow-purple-950/70',
      badgeBg: 'bg-purple-950 text-purple-200'
    },
    { 
      label: 'Realizadas', 
      value: 'Realizada', 
      count: completedCount, 
      activeBg: 'bg-emerald-600/90 text-white',
      activeBorder: 'border-emerald-400 shadow-emerald-950/70',
      badgeBg: 'bg-emerald-950 text-emerald-200'
    },
    { 
      label: 'Não Compareceu', 
      value: 'Não Compareceu', 
      count: absentCount, 
      activeBg: 'bg-rose-600/90 text-white',
      activeBorder: 'border-rose-400 shadow-rose-950/70',
      badgeBg: 'bg-rose-950 text-rose-200'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1 sm:py-1.5 no-print space-y-1.5">
      {/* Top summary metric cards - Ultra Compactos para economizar espaço de tela */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
        
        {/* Metric 1: Total Cadastrado (Azul / Ciano) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('TODOS')}
          className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'TODOS'
              ? 'bg-[#102046] border-blue-400 ring-1 ring-blue-400/60 shadow-blue-950/80'
              : 'bg-[#0c162b] border-blue-700/50 hover:border-blue-400 hover:bg-[#122247]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-950 border border-blue-400/80 flex items-center justify-center text-blue-200 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider truncate">
              Cadastrados
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none shrink-0">
            {total}
          </span>
        </button>

        {/* Metric 2: Oitivas de Hoje (Âmbar / Dourado) */}
        <div className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center justify-between gap-2 shadow-sm ${
          todayCount > 0 
            ? 'bg-[#312007] border-amber-400 ring-1 ring-amber-400/50 shadow-amber-950/60' 
            : 'bg-[#1c1205] border-amber-700/50'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-400/80 flex items-center justify-center text-amber-200 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-amber-200 uppercase tracking-wider truncate">
              Hoje
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none">
              {todayCount}
            </span>
            {todayCount > 0 && (
              <span className="text-[9px] font-black text-amber-950 bg-amber-300 px-1 py-0.2 rounded">
                Hoje
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Agendadas (Roxo / Púrpura) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Agendada')}
          className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'Agendada'
              ? 'bg-[#281548] border-purple-400 ring-1 ring-purple-400/60 shadow-purple-950/80'
              : 'bg-[#1a0e30] border-purple-700/50 hover:border-purple-400 hover:bg-[#251344]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-purple-950 border border-purple-400/80 flex items-center justify-center text-purple-200 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-purple-200 uppercase tracking-wider truncate">
              Agendadas
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none shrink-0">
            {scheduledCount}
          </span>
        </button>

        {/* Metric 4: Realizadas (Verde Esmeralda) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Realizada')}
          className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm ${
            selectedStatusFilter === 'Realizada'
              ? 'bg-[#0c3122] border-emerald-400 ring-1 ring-emerald-400/60 shadow-emerald-950/80'
              : 'bg-[#082017] border-emerald-700/50 hover:border-emerald-400 hover:bg-[#0c3022]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-400/80 flex items-center justify-center text-emerald-200 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider truncate">
              Realizadas
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none shrink-0">
            {completedCount}
          </span>
        </button>

        {/* Metric 5: Não Compareceu / Faltas (Rosa / Vermelho) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Não Compareceu')}
          className={`px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 col-span-2 sm:col-span-1 shadow-sm ${
            selectedStatusFilter === 'Não Compareceu'
              ? 'bg-[#3b121f] border-rose-400 ring-1 ring-rose-400/60 shadow-rose-950/80'
              : 'bg-[#240b14] border-rose-700/50 hover:border-rose-400 hover:bg-[#340f1c]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-950 border border-rose-400/80 flex items-center justify-center text-rose-200 shrink-0">
              <UserX className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-black text-rose-200 uppercase tracking-wider truncate">
              Faltas
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-white tracking-tight leading-none shrink-0">
            {absentCount}
          </span>
        </button>

      </div>

      {/* Filter Chips Compactos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-purple-200 font-bold shrink-0 pr-1">
          <Filter className="w-3 h-3 text-purple-300" />
          <span>Filtro:</span>
        </div>
        
        {filters.map((f) => {
          const isActive = selectedStatusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onStatusFilterChange(f.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer shadow-sm ${
                isActive
                  ? `${f.activeBg} ${f.activeBorder} shadow-sm`
                  : 'bg-[#151026] border-purple-800/50 text-zinc-300 hover:text-white hover:border-purple-400 hover:bg-[#1d1633]'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                isActive ? f.badgeBg : 'bg-[#251c3d] text-purple-200 border border-purple-500/30'
              }`}>
                {f.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
