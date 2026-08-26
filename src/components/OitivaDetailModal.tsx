import React, { useState } from 'react';
import { 
  X, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  FileText, 
  Check, 
  Edit3, 
  Trash2, 
  Video, 
  Phone, 
  Mail, 
  HardDrive, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { 
  getStatusBadgeClasses, 
  getRoleBadgeClasses, 
  formatDateBR 
} from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface OitivaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  onEdit: (oitiva: Oitiva) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextStatus: boolean) => void;
  onOpenPrint?: () => void;
  onOpenPrintIntimacao?: () => void;
  onOpenWhatsApp?: (oitiva: Oitiva) => void;
  onSyncCalendar?: (oitiva: Oitiva) => void;
  onSendGmail?: (oitiva: Oitiva) => void;
  onSaveDrive?: (oitiva: Oitiva) => void;
}

export const OitivaDetailModal: React.FC<OitivaDetailModalProps> = ({
  isOpen,
  onClose,
  oitiva,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleIntimationSent,
  onOpenPrintIntimacao,
  onOpenWhatsApp,
  onSyncCalendar,
  onSendGmail,
  onSaveDrive
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !oitiva) return null;

  const statuses: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];

  const handleConfirmDelete = async () => {
    if (!oitiva) return;
    setIsDeleting(true);
    try {
      await onDelete(oitiva.id);
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/90 my-auto flex flex-col">
          
          {/* Header Compacto */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/60 flex items-center justify-center text-purple-200 shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-2 ${getRoleBadgeClasses(oitiva.role)}`}>
                    {oitiva.role || 'Oitiva'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-2 ${getStatusBadgeClasses(oitiva.status)}`}>
                    {oitiva.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                  {oitiva.personName}
                </h2>
              </div>
            </div>

            {/* Ações do Header: Editar, Excluir (Lixeira Vermelha) e Fechar */}
            <div className="flex items-center gap-2">
              <button
                id="btn-edit-oitiva-header"
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(oitiva);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-500/70 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Oitiva</span>
              </button>

              {/* Botão Excluir Oitiva como símbolo de lixeira vermelho ao lado de Editar */}
              <button
                id="btn-delete-oitiva-header"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border-2 border-rose-600/70 hover:border-rose-400 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Excluir Oitiva"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="btn-close-detail-modal"
                type="button"
                onClick={onClose}
                className="p-2 text-zinc-300 hover:text-white hover:bg-purple-950/60 border border-purple-900/40 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content: 3 Colunas Compactas e Proporcionais */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* COLUNA 1: DADOS DO DEPOENTE (4 Cols) */}
            <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                  <User className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Qualificação do Depoente
                  </h3>
                </div>

                {/* Card Dados Pessoais */}
                <div className="bg-[#171326] p-3.5 rounded-2xl border border-purple-900/30 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Nome Completo:</span>
                    <span className="font-bold text-white text-sm">{oitiva.personName}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-900/20">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">CPF:</span>
                      <span className="font-mono text-zinc-200 text-xs font-medium">{oitiva.cpf || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">RG / Órgão:</span>
                      <span className="text-zinc-200 text-xs">{oitiva.rg || 'Não informado'}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-purple-900/20">
                    <span className="text-[10px] text-zinc-500 block">Telefone / WhatsApp:</span>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{oitiva.phone || 'Não informado'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 block">E-mail:</span>
                    <div className="flex items-center gap-1.5 text-zinc-300 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{oitiva.email || 'Não informado'}</span>
                    </div>
                  </div>

                  {/* Endereço */}
                  {(oitiva.address || oitiva.neighborhood || oitiva.city) && (
                    <div className="pt-2 border-t border-purple-900/20">
                      <span className="text-[10px] text-zinc-500 block">Endereço Residencial:</span>
                      <p className="text-zinc-300 text-xs leading-relaxed">
                        {[oitiva.address, oitiva.neighborhood, oitiva.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsáveis Policiais */}
              <div className="bg-[#1a142e] border border-purple-900/40 p-3 rounded-2xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-purple-300 block">Equipe Responsável</span>
                {oitiva.officerName && (
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-zinc-400 text-[11px]">DPC:</span>
                    <strong className="text-white text-xs truncate">{oitiva.officerName}</strong>
                  </div>
                )}
                {oitiva.clerkName && (
                  <div className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-zinc-500">Escrivão(ã):</span>
                    <span className="truncate">{oitiva.clerkName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA 2: AGENDAMENTO & PROCEDIMENTO (4 Cols) */}
            <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Agendamento & Procedimento
                  </h3>
                </div>

                {/* Data, Horário e Procedimento */}
                <div className="bg-[#171326] p-3.5 rounded-2xl border border-purple-900/30 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#110d1e] p-2.5 rounded-xl border border-purple-900/40">
                      <span className="text-[10px] text-zinc-400 block mb-1">Data:</span>
                      <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                        <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span>{formatDateBR(oitiva.date)}</span>
                      </div>
                    </div>
                    <div className="bg-[#110d1e] p-2.5 rounded-xl border border-purple-900/40">
                      <span className="text-[10px] text-zinc-400 block mb-1">Horário:</span>
                      <div className="flex items-center gap-1.5 text-purple-300 font-mono font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>{oitiva.time ? `${oitiva.time}h` : 'A definir'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-purple-900/20">
                    <span className="text-[10px] text-zinc-500 block">Procedimento Policial:</span>
                    <div className="flex items-center gap-1.5 text-white font-semibold text-xs mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>{oitiva.procedureType || 'Procedimento'} nº {oitiva.procedureNumber || 'S/N'}</span>
                    </div>
                  </div>

                  {/* Formato e Local */}
                  <div className="pt-1 border-t border-purple-900/20">
                    <span className="text-[10px] text-zinc-500 block">Formato & Localização:</span>
                    {oitiva.modality === 'Videoconferência' ? (
                      <div className="flex items-center gap-1.5 text-blue-300 font-medium mt-0.5">
                        <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Videoconferência</span>
                        {oitiva.locationOrLink && (
                          <a 
                            href={oitiva.locationOrLink.startsWith('http') ? oitiva.locationOrLink : `https://${oitiva.locationOrLink}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-purple-400 underline truncate max-w-[150px] text-[11px]"
                          >
                            {oitiva.locationOrLink}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-zinc-200 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="font-semibold text-zinc-300">{oitiva.modality || 'Presencial'}:</span>
                        <span className="text-zinc-200">{oitiva.locationOrLink || 'Sala de Oitivas / Cartório'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações */}
                {oitiva.notes && (
                  <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 text-xs">
                    <span className="text-[10px] font-semibold text-zinc-400 block mb-1">Observações & Anotações:</span>
                    <p className="text-zinc-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {oitiva.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* DESTAQUE REFORÇADO PARA O STATUS DA INTIMAÇÃO (ALTERÁVEL COM UM CLIQUE) */}
              <div className="space-y-1">
                <button
                  id="btn-toggle-intimacao-status"
                  type="button"
                  onClick={() => onToggleIntimationSent && onToggleIntimationSent(oitiva.id, !oitiva.intimationSent)}
                  className={`w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all duration-200 cursor-pointer text-left group ${
                    oitiva.intimationSent
                      ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/80 border-emerald-400/80 hover:border-emerald-300 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                      : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/60 hover:border-amber-400 shadow-lg shadow-amber-950/40'
                  }`}
                  title="Clique para alternar o status da intimação (Enviada / Pendente)"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                      oitiva.intimationSent
                        ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300'
                        : 'bg-amber-500/20 border border-amber-400 text-amber-300'
                    }`}>
                      {oitiva.intimationSent ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] uppercase font-black tracking-wider block ${
                          oitiva.intimationSent ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          Status da Intimação
                        </span>
                        <span className="text-[9px] text-zinc-400 font-normal">
                          (Clique p/ alternar)
                        </span>
                      </div>
                      <span className="text-xs font-black text-white block truncate">
                        {oitiva.intimationSent ? 'INTIMAÇÃO ENVIADA / EMITIDA' : 'PENDENTE DE ENVIO'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg tracking-wider uppercase transition-all shadow-sm ${
                      oitiva.intimationSent
                        ? 'bg-emerald-500 text-emerald-950 group-hover:bg-emerald-400'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 group-hover:bg-amber-500/30'
                    }`}>
                      {oitiva.intimationSent ? 'Enviada' : 'Pendente'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* COLUNA 3: STATUS & AÇÕES RÁPIDAS (4 Cols) */}
            <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-purple-900/30">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Controle & Ações
                  </h3>
                </div>

                {/* Alterar Status */}
                <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30">
                  <p className="text-[10px] font-semibold text-zinc-400 mb-2">Alterar Status da Oitiva:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {statuses.map((st) => {
                      const isActive = oitiva.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => onStatusChange(oitiva.id, st)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? `${getStatusBadgeClasses(st)} shadow-sm`
                              : 'bg-[#100d1c] border-purple-900/30 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3" />}
                          <span>{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botões Principais: WhatsApp e Mandado (Imprimir Ficha Completa removido) */}
                <div className="space-y-2">
                  {onOpenWhatsApp && (
                    <button
                      type="button"
                      onClick={() => onOpenWhatsApp(oitiva)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/70 rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 transition-all cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                      <span>WhatsApp (Texto + PDF Oficial)</span>
                    </button>
                  )}

                  {onOpenPrintIntimacao && (
                    <button
                      type="button"
                      onClick={onOpenPrintIntimacao}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-400/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <FileText className="w-4 h-4 text-purple-300" />
                      <span>Fazer Download da Intimação (PDF)</span>
                    </button>
                  )}
                </div>

                {/* Google Workspace */}
                <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 block">Sincronização Google Workspace:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSyncCalendar && onSyncCalendar(oitiva)}
                      className="p-1.5 bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 rounded-lg text-[10px] font-semibold transition-all flex flex-col items-center gap-1 text-center"
                      title="Google Calendar"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Calendar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSendGmail && onSendGmail(oitiva)}
                      className="p-1.5 bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-lg text-[10px] font-semibold transition-all flex flex-col items-center gap-1 text-center"
                      title="Gmail"
                    >
                      <Mail className="w-3.5 h-3.5 text-rose-400" />
                      <span>Gmail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                      className="p-1.5 bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-lg text-[10px] font-semibold transition-all flex flex-col items-center gap-1 text-center"
                      title="Google Drive"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                      <span>Drive</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Compacto */}
          <div className="p-3 sm:p-4 border-t border-purple-900/40 bg-[#161226] flex items-center justify-between shrink-0 text-xs">
            <span className="text-zinc-400 text-xs">
              1ª Delegacia de Polícia de Maracanaú • Sistema Oficial
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#201838] hover:bg-purple-950 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold border border-purple-800/40 transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>

        </div>
      </div>

      {/* Modal de Confirmação para Exclusão de Oitiva */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Oitiva?"
        message={`Confirma a exclusão definitiva do agendamento de "${oitiva.personName}" (Procedimento: ${oitiva.procedureNumber || 'S/N'})? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir Oitiva"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
};
