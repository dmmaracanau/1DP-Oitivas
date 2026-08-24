import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  FileText,
  Phone,
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Oitiva, HearingStatus, HearingRole } from '../types/oitiva';
import { formatDateBR, getRoleBadgeClasses, getStatusBadgeClasses, generateWhatsAppReminder } from '../utils/formatters';

interface OitivaListViewProps {
  oitivas: Oitiva[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectOitiva: (oitiva: Oitiva) => void;
  onEditOitiva: (oitiva: Oitiva) => void;
  onDeleteOitiva: (id: string) => void;
  onPrintIntimacao: (oitiva: Oitiva) => void;
  statusFilter: HearingStatus | 'TODOS';
  onStatusFilterChange: (status: HearingStatus | 'TODOS') => void;
  onAddOitiva: () => void;
}

export const OitivaListView: React.FC<OitivaListViewProps> = ({
  oitivas,
  searchQuery,
  onSearchChange,
  onSelectOitiva,
  onEditOitiva,
  onDeleteOitiva,
  onPrintIntimacao,
  statusFilter,
  onStatusFilterChange,
  onAddOitiva
}) => {
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter oitivas
  const filtered = oitivas.filter((item) => {
    const matchesSearch = 
      item.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.procedureNumber && item.procedureNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.cpf && item.cpf.includes(searchQuery)) ||
      (item.phone && item.phone.includes(searchQuery)) ||
      (item.officerName && item.officerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'TODOS' || item.status === statusFilter;
    const matchesRole = roleFilter === 'TODOS' || item.role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  }).sort((a, b) => {
    // Sort by date then time
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.time || '').localeCompare(b.time || '');
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12">
      <div className="bg-[#100d1b] border border-purple-900/30 rounded-3xl overflow-hidden shadow-2xl shadow-black/80">
        
        {/* Table Toolbar */}
        <div className="p-5 border-b border-purple-900/30 bg-[#141021]/70 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Listagem Geral de Oitivas
            </h2>
            <p className="text-xs text-purple-300/70">
              {filtered.length} {filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#1a152b] border border-purple-900/40 text-xs text-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="TODOS">Todas as Condições</option>
              <option value="Testemunha">Testemunha</option>
              <option value="Vítima">Vítima</option>
              <option value="Investigado">Investigado</option>
              <option value="Declarante">Declarante</option>
              <option value="Informante">Informante</option>
            </select>

            <button
              onClick={onAddOitiva}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-900/40"
            >
              + Nova Oitiva
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#0c0a15] text-zinc-400 font-semibold border-b border-purple-900/20 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Depoente / Pessoa Ouvida</th>
                <th className="py-3.5 px-4">Data & Horário</th>
                <th className="py-3.5 px-4">Procedimento</th>
                <th className="py-3.5 px-4">Condição</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Contato / Local</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/10">
              {filtered.length > 0 ? (
                filtered.map((oitiva) => (
                  <tr 
                    key={oitiva.id}
                    className="hover:bg-[#161226] transition-colors cursor-pointer group"
                    onClick={() => onSelectOitiva(oitiva)}
                  >
                    {/* Person Name (Primary Column) */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                        {oitiva.personName}
                      </div>
                      {oitiva.cpf && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          CPF: {oitiva.cpf}
                        </div>
                      )}
                    </td>

                    {/* Date and Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                        <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span>{formatDateBR(oitiva.date)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-purple-300 font-mono mt-0.5">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>{oitiva.time || '--:--'}</span>
                      </div>
                    </td>

                    {/* Procedure */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-200">
                        {oitiva.procedureNumber || 'Não informado'}
                      </div>
                      {oitiva.procedureType && (
                        <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                          {oitiva.procedureType}
                        </div>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClasses(oitiva.role)}`}>
                        {oitiva.role || 'Depoente'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getStatusBadgeClasses(oitiva.status)}`}>
                        {oitiva.status}
                      </span>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3.5 px-4">
                      {oitiva.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-300">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{oitiva.phone}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-400 truncate max-w-[160px]">
                        {oitiva.locationOrLink || oitiva.modality || 'Presencial'}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {confirmDeleteId === oitiva.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-950/80 p-1 rounded-lg border border-rose-500/50">
                            <span className="text-[10px] font-semibold text-rose-200 pl-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteOitiva(oitiva.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition-colors"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            {oitiva.phone && (
                              <a
                                href={generateWhatsAppReminder(oitiva)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-colors"
                                title="Notificar via WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => onPrintIntimacao(oitiva)}
                              className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-purple-950/50 rounded-lg transition-colors"
                              title="Imprimir Mandado de Intimação (PDF)"
                            >
                              <Printer className="w-3.5 h-3.5 text-purple-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditOitiva(oitiva)}
                              className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-purple-950/50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(oitiva.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Nenhuma oitiva encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
