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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 no-print space-y-2 sm:space-y-2.5">
      {/* Top summary metric cards - Compactos e com cores temáticas individuais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        
        {/* Metric 1: Total Cadastrado (Azul / Ciano) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('TODOS')}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
            selectedStatusFilter === 'TODOS'
              ? 'bg-[#0d172e] border-blue-500 ring-1 ring-blue-500/50 shadow-md shadow-blue-950/50'
              : 'bg-[#0b1222]/90 border-blue-900/40 hover:border-blue-500/40 hover:bg-[#0e1933]'
          }`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-blue-300/80 uppercase tracking-wider truncate">
              Total Cadastrado
            </p>
            <p className="text-sm sm:text-base font-black text-blue-100 tracking-tight leading-none mt-0.5">
              {total}
            </p>
          </div>
        </button>

        {/* Metric 2: Oitivas de Hoje (Âmbar / Dourado) */}
        <div className={`p-2 sm:p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
          todayCount > 0 
            ? 'bg-[#261a07]/90 border-amber-500/50 ring-1 ring-amber-500/30 shadow-md shadow-amber-950/40' 
            : 'bg-[#181105]/90 border-amber-900/30'
        }`}>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-300/90 uppercase tracking-wider truncate">
              Oitivas Hoje
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <p className="text-sm sm:text-base font-black text-amber-200 tracking-tight leading-none">
                {todayCount}
              </p>
              {todayCount > 0 && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">
                  Hoje
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Agendadas (Roxo / Púrpura) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Agendada')}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
            selectedStatusFilter === 'Agendada'
              ? 'bg-[#1e1136] border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/50'
              : 'bg-[#140b24]/90 border-purple-900/40 hover:border-purple-500/40 hover:bg-[#1a0f2f]'
          }`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider truncate">
              Agendadas
            </p>
            <p className="text-sm sm:text-base font-black text-purple-100 tracking-tight leading-none mt-0.5">
              {scheduledCount}
            </p>
          </div>
        </button>

        {/* Metric 4: Realizadas (Verde Esmeralda) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Realizada')}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
            selectedStatusFilter === 'Realizada'
              ? 'bg-[#0a241a] border-emerald-500 ring-1 ring-emerald-500/50 shadow-md shadow-emerald-950/50'
              : 'bg-[#071a13]/90 border-emerald-900/40 hover:border-emerald-500/40 hover:bg-[#0c261c]'
          }`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider truncate">
              Realizadas
            </p>
            <p className="text-sm sm:text-base font-black text-emerald-100 tracking-tight leading-none mt-0.5">
              {completedCount}
            </p>
          </div>
        </button>

        {/* Metric 5: Não Compareceu / Faltas (Rosa / Vermelho) */}
        <button
          type="button"
          onClick={() => onStatusFilterChange('Não Compareceu')}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 col-span-2 sm:col-span-1 ${
            selectedStatusFilter === 'Não Compareceu'
              ? 'bg-[#290d16] border-rose-500 ring-1 ring-rose-500/50 shadow-md shadow-rose-950/50'
              : 'bg-[#1c0910]/90 border-rose-900/40 hover:border-rose-500/40 hover:bg-[#250d17]'
          }`}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-rose-300/80 uppercase tracking-wider truncate">
              Não Compareceu
            </p>
            <p className="text-sm sm:text-base font-black text-rose-100 tracking-tight leading-none mt-0.5">
              {absentCount}
            </p>
          </div>
        </button>

      </div>

      {/* Filter Chips Compactos */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold shrink-0 pr-1">
          <Filter className="w-3 h-3 text-purple-400" />
          <span>Filtrar:</span>
        </div>
        
        {filters.map((f) => {
          const isActive = selectedStatusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onStatusFilterChange(f.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer ${
                isActive
                  ? `${f.activeBg} ${f.activeBorder} shadow-sm`
                  : 'bg-[#13101e] border-purple-900/30 text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1428]'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                isActive ? f.badgeBg : 'bg-[#1b152b] text-zinc-400'
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
