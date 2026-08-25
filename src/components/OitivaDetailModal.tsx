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
  Printer, 
  HardDrive, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Shield
} from 'lucide-react';
import { Oitiva, HearingStatus } from '../types/oitiva';
import { 
  getStatusBadgeClasses, 
  getRoleBadgeClasses, 
  formatDateBR, 
  generateWhatsAppReminder 
} from '../utils/formatters';

interface OitivaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  onEdit: (oitiva: Oitiva) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: HearingStatus) => void;
  onOpenPrint: () => void;
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
  onOpenPrint,
  onOpenPrintIntimacao,
  onOpenWhatsApp,
  onSyncCalendar,
  onSendGmail,
  onSaveDrive
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !oitiva) return null;

  const statuses: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/60 my-auto flex flex-col">
        
        {/* Header Compacto */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-900/40 bg-[#161226] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border border-purple-400/40 flex items-center justify-center text-purple-200 shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeClasses(oitiva.role)}`}>
                  {oitiva.role || 'Oitiva'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadgeClasses(oitiva.status)}`}>
                  {oitiva.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                {oitiva.personName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(oitiva);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Oitiva</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-purple-950/50 rounded-xl transition-colors cursor-pointer"
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

            {/* Status da Intimação */}
            <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400">Intimação enviada?</span>
              {oitiva.intimationSent ? (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Intimação Realizada
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-semibold">
                  Pendente de Envio
                </span>
              )}
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

              {/* Botões Principais: WhatsApp e Mandado */}
              <div className="space-y-2">
                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(oitiva)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/60 transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp (Texto + PDF Oficial)</span>
                  </button>
                )}

                {onOpenPrintIntimacao && (
                  <button
                    type="button"
                    onClick={onOpenPrintIntimacao}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Mandado de Intimação (A4)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenPrint}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1a142e] hover:bg-purple-950/60 text-zinc-300 hover:text-white border border-purple-900/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Imprimir Ficha Completa</span>
                </button>
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

            {/* Exclusão */}
            <div className="pt-2">
              {showDeleteConfirm ? (
                <div className="bg-rose-950/80 p-2.5 rounded-2xl border border-rose-500/50 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-rose-200">Confirmar exclusão?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(oitiva.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir Oitiva</span>
                </button>
              )}
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
  );
};
