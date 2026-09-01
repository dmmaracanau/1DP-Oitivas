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
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  statusFilter: HearingStatus | 'TODOS';
  onStatusFilterChange: (status: HearingStatus | 'TODOS') => void;
  onAddOitiva: () => void;
  onExportBackup?: () => void;
}

export const OitivaListView: React.FC<OitivaListViewProps> = ({
  oitivas,
  searchQuery,
  onSearchChange,
  onSelectOitiva,
  onEditOitiva,
  onDeleteOitiva,
  onPrintIntimacao,
  onOpenWhatsApp,
  statusFilter,
  onStatusFilterChange,
  onAddOitiva,
  onExportBackup
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
    <div className="w-full max-w-[98.5%] 2xl:max-w-[1920px] mx-auto px-1 sm:px-2.5 lg:px-4 pb-10">
      <div className="bg-[#0e0a1a] border-2 border-purple-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/60">
        
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b-2 border-purple-700/60 bg-[#161026] flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Listagem Geral de Oitivas
            </h2>
            <p className="text-xs font-bold text-purple-200 mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#1f1638] border-2 border-purple-600/70 text-xs font-bold text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-400 shadow-sm cursor-pointer"
            >
              <option value="TODOS">Todas as Condições</option>
              <option value="Testemunha">Testemunha</option>
              <option value="Vítima">Vítima</option>
              <option value="Investigado">Investigado</option>
              <option value="Declarante">Declarante</option>
              <option value="Informante">Informante</option>
            </select>

            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#121b3b] hover:bg-[#1a2856] text-blue-200 hover:text-white border-2 border-blue-500/70 hover:border-blue-400 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Exportar Backup das oitivas cadastradas em arquivo JSON"
              >
                <Download className="w-3.5 h-3.5 text-blue-300" />
                <span>Exportar Backup</span>
              </button>
            )}

            <button
              onClick={onAddOitiva}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-2 border-purple-300 rounded-xl text-xs font-black shadow-md shadow-purple-950/80 transition-all cursor-pointer"
            >
              + Nova Oitiva
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-200">
            <thead className="bg-[#120d22] text-purple-200 font-black border-b-2 border-purple-700/60 uppercase tracking-wider text-[11px]">
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
            <tbody className="divide-y-2 divide-purple-900/30">
              {filtered.length > 0 ? (
                filtered.map((oitiva) => (
                  <tr 
                    key={oitiva.id}
                    className="hover:bg-[#1f1538] transition-colors cursor-pointer group"
                    onClick={() => onSelectOitiva(oitiva)}
                  >
                    {/* Person Name (Primary Column) */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-sm text-white group-hover:text-purple-300 transition-colors">
                        {oitiva.personName}
                      </div>
                      {oitiva.cpf && (
                        <div className="text-[11px] text-purple-300/80 font-mono font-medium">
                          CPF: {oitiva.cpf}
                        </div>
                      )}
                    </td>

                    {/* Date and Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-100">
                        <CalendarIcon className="w-4 h-4 text-purple-300" />
                        <span>{formatDateBR(oitiva.date)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-black/85 text-amber-300 border border-amber-400/80 shadow-sm mt-1">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{oitiva.time || '--:--'}</span>
                      </div>
                    </td>

                    {/* Procedure */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-100">
                        {oitiva.procedureNumber || 'Não informado'}
                      </div>
                      {oitiva.procedureType && (
                        <div className="text-[11px] text-purple-300/70 font-medium truncate max-w-[140px]">
                          {oitiva.procedureType}
                        </div>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg border-2 ${getRoleBadgeClasses(oitiva.role)}`}>
                        {oitiva.role || 'Depoente'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-xs font-black px-3 py-1 rounded-lg border-2 shadow-sm ${getStatusBadgeClasses(oitiva.status)}`}>
                        {oitiva.status}
                      </span>
                    </td>

                    {/* Contact & Location */}
                    <td className="py-3.5 px-4">
                      {oitiva.phone && (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{oitiva.phone}</span>
                        </div>
                      )}
                      <div className="text-xs text-zinc-300 font-medium truncate max-w-[160px]">
                        {oitiva.locationOrLink || oitiva.modality || 'Presencial'}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {confirmDeleteId === oitiva.id ? (
                          <div className="flex items-center gap-1.5 bg-rose-950 p-1 rounded-xl border-2 border-rose-500">
                            <span className="text-[10px] font-black text-rose-200 pl-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteOitiva(oitiva.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-black transition-colors"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            {onOpenWhatsApp ? (
                              <button
                                type="button"
                                onClick={() => onOpenWhatsApp(oitiva)}
                                className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-900 border-2 border-emerald-700/60 rounded-xl transition-all cursor-pointer shadow-sm"
                                title="Notificar via WhatsApp (Texto + PDF)"
                              >
                                <Phone className="w-4 h-4" />
                              </button>
                            ) : oitiva.phone ? (
                              <a
                                href={generateWhatsAppReminder(oitiva)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-emerald-300 hover:text-white hover:bg-emerald-900 border-2 border-emerald-700/60 rounded-xl transition-all shadow-sm"
                                title="Notificar via WhatsApp"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => onPrintIntimacao(oitiva)}
                              className="p-2 text-purple-200 hover:text-white bg-purple-950 hover:bg-purple-900 border-2 border-purple-400 rounded-xl transition-all shadow-sm"
                              title="Fazer Download da Intimação (PDF)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditOitiva(oitiva)}
                              className="p-2 text-zinc-300 hover:text-white hover:bg-purple-900 border-2 border-purple-700/60 rounded-xl transition-all"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(oitiva.id)}
                              className="p-2 text-rose-300 hover:text-white hover:bg-rose-900 border-2 border-rose-700/60 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-bold">
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
