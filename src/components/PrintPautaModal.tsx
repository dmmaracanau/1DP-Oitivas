import React, { useState } from 'react';
import { X, Printer, Calendar, FileText, Download, HardDrive, Mail } from 'lucide-react';
import { Oitiva } from '../types/oitiva';
import { formatDateBR } from '../utils/formatters';
import { OfficialCeHeader } from './OfficialCeHeader';

interface PrintPautaModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitivas: Oitiva[];
  currentDate: Date;
  onOpenWorkspaceWithPauta?: (tab: 'drive' | 'gmail') => void;
}

export const PrintPautaModal: React.FC<PrintPautaModalProps> = ({
  isOpen,
  onClose,
  oitivas,
  currentDate,
  onOpenWorkspaceWithPauta
}) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [filterMode, setFilterMode] = useState<'day' | 'all'>('day');

  if (!isOpen) return null;

  const filteredOitivas = (filterMode === 'day' 
    ? oitivas.filter(o => o.date === selectedDate)
    : oitivas
  ).sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.time || '').localeCompare(b.time || '');
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl shadow-purple-950/60 my-8">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="p-4 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pauta Oficial de Oitivas para Impressão
              </h2>
              <p className="text-xs text-purple-300/70">
                Gere a folha de pauta para o cartório e salas de audiência.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWorkspaceWithPauta && (
              <>
                <button
                  id="pauta-export-drive-btn"
                  onClick={() => onOpenWorkspaceWithPauta('drive')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1b152d] hover:bg-amber-950/40 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors"
                  title="Salvar Pauta no Google Drive"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Salvar no Drive</span>
                </button>

                <button
                  id="pauta-send-gmail-btn"
                  onClick={() => onOpenWorkspaceWithPauta('gmail')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1b152d] hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors"
                  title="Enviar Pauta por Gmail"
                >
                  <Mail className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Enviar por Gmail</span>
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar (Hidden in print) */}
        <div className="p-4 bg-[#0e0c18] border-b border-purple-900/20 flex flex-wrap items-center gap-3 text-xs no-print">
          <span className="text-zinc-400 font-medium">Exibir:</span>
          <button
            onClick={() => setFilterMode('day')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'day' ? 'bg-purple-600 text-white' : 'bg-[#181426] text-zinc-400'
            }`}
          >
            Pauta por Dia
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'all' ? 'bg-purple-600 text-white' : 'bg-[#181426] text-zinc-400'
            }`}
          >
            Todas as Agendadas
          </button>

          {filterMode === 'day' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[#181426] border border-purple-900/40 text-zinc-200 px-3 py-1 rounded-lg text-xs"
            />
          )}
        </div>

        {/* PRINTABLE SHEET */}
        <div className="p-8 bg-white text-black print-page max-h-[70vh] overflow-y-auto">
          {/* Official Header Image (Exact from Drive) */}
          <OfficialCeHeader scale={80} className="mb-4" />

          {/* Document Title */}
          <div className="text-center border-b-2 border-black pb-3 mb-6">
            <h3 className="text-base font-black uppercase tracking-tight text-black font-sans">
              PAUTA DE OITIVAS E DEPOIMENTOS
            </h3>
            <p className="text-xs font-semibold text-zinc-800 mt-1 font-sans">
              {filterMode === 'day' ? `Data: ${formatDateBR(selectedDate)}` : 'Relação Geral de Oitivas'}
            </p>
          </div>

          {/* Table */}
          {filteredOitivas.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse border border-zinc-400 mb-8">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-400 text-zinc-800 font-bold uppercase text-[10px]">
                  <th className="p-2 border border-zinc-400 w-16 text-center">Hora</th>
                  <th className="p-2 border border-zinc-400">Pessoa a ser Ouvida (Depoente)</th>
                  <th className="p-2 border border-zinc-400 w-24">Condição</th>
                  <th className="p-2 border border-zinc-400 w-28">Procedimento</th>
                  <th className="p-2 border border-zinc-400 w-28">Local / Sala</th>
                  <th className="p-2 border border-zinc-400 w-24 text-center">Status</th>
                  <th className="p-2 border border-zinc-400 w-32 text-center">Assinatura / Visto</th>
                </tr>
              </thead>
              <tbody>
                {filteredOitivas.map((item, idx) => (
                  <tr key={item.id} className="border-b border-zinc-300">
                    <td className="p-2 border border-zinc-300 font-mono font-bold text-center">
                      {item.time || '--:--'}
                    </td>
                    <td className="p-2 border border-zinc-300">
                      <div className="font-bold text-black">{item.personName}</div>
                      {item.cpf && <div className="text-[10px] text-zinc-600 font-mono">CPF: {item.cpf}</div>}
                      {item.phone && <div className="text-[10px] text-zinc-600">Tel: {item.phone}</div>}
                    </td>
                    <td className="p-2 border border-zinc-300 font-medium">
                      {item.role || 'Oitiva'}
                    </td>
                    <td className="p-2 border border-zinc-300">
                      <div className="font-semibold">{item.procedureNumber || 'S/N'}</div>
                      <div className="text-[9px] text-zinc-500">{item.procedureType || ''}</div>
                    </td>
                    <td className="p-2 border border-zinc-300 text-[11px]">
                      {item.locationOrLink || item.modality || 'Presencial'}
                    </td>
                    <td className="p-2 border border-zinc-300 text-center font-semibold">
                      {item.status}
                    </td>
                    <td className="p-2 border border-zinc-300 text-center">
                      <div className="border-b border-zinc-400 w-full h-6"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-zinc-500 italic">
              Nenhuma oitiva agendada para os critérios selecionados.
            </div>
          )}

          {/* Signatures block */}
          <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-zinc-300 text-center text-xs">
            <div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                Autoridade Policial / Delegado(a)
              </div>
              <p className="text-[10px] text-zinc-600">Delegacia Metropolitana de Maracanaú</p>
            </div>

            <div>
              <div className="border-t border-black w-3/4 mx-auto pt-1 font-bold">
                Escrivão(ã) / Cartório de Oitivas
              </div>
              <p className="text-[10px] text-zinc-600">Responsável pelo Registro</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
