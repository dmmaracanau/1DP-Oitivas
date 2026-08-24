import React from 'react';
import { Calendar, CheckCircle2, AlertCircle, Clock, Users } from 'lucide-react';
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

  const filters: { label: string; value: HearingStatus | 'TODOS'; count: number; color: string }[] = [
    { label: 'Todas as Oitivas', value: 'TODOS', count: total, color: 'hover:border-purple-500/50' },
    { label: 'Agendadas', value: 'Agendada', count: scheduledCount, color: 'hover:border-purple-400' },
    { label: 'Realizadas', value: 'Realizada', count: completedCount, color: 'hover:border-emerald-500' },
    { label: 'Não Compareceu', value: 'Não Compareceu', count: absentCount, color: 'hover:border-orange-500' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 no-print space-y-4">
      {/* Top summary metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Metric 1: Total */}
        <div className="bg-[#120f1d] border border-purple-900/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-black/40">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Total Cadastrado</p>
            <p className="text-xl font-bold text-white tracking-tight">{total}</p>
          </div>
        </div>

        {/* Metric 2: Today's hearings */}
        <div className={`border rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-black/40 ${
          todayCount > 0 
            ? 'bg-purple-950/30 border-purple-500/50 text-purple-200 ring-1 ring-purple-500/30' 
            : 'bg-[#120f1d] border-purple-900/30'
        }`}>
          <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-400/40 flex items-center justify-center text-purple-300">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-purple-300">Oitivas de Hoje</p>
            <p className="text-xl font-bold text-white tracking-tight">{todayCount}</p>
          </div>
        </div>

        {/* Metric 3: Scheduled */}
        <div className="bg-[#120f1d] border border-purple-900/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-black/40">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Agendadas</p>
            <p className="text-xl font-bold text-purple-200 tracking-tight">{scheduledCount}</p>
          </div>
        </div>

        {/* Metric 4: Completed */}
        <div className="bg-[#120f1d] border border-purple-900/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-black/40">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-zinc-400">Concluídas</p>
            <p className="text-xl font-bold text-emerald-400 tracking-tight">{completedCount}</p>
          </div>
        </div>

      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-zinc-500 font-medium whitespace-nowrap pl-1">Filtrar status:</span>
        {filters.map((f) => {
          const isActive = selectedStatusFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => onStatusFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer ${
                isActive
                  ? 'bg-purple-600 border-purple-400 text-white shadow-sm shadow-purple-900/60'
                  : 'bg-[#151221] border-purple-900/30 text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1930]'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-purple-900 text-purple-200' : 'bg-zinc-800 text-zinc-400'
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
