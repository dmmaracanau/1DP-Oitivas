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
  AlertCircle,
  RotateCcw,
  History,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Oitiva, HearingStatus, UserProfile } from '../types/oitiva';
import { 
  getStatusBadgeClasses, 
  getRoleBadgeClasses, 
  formatDateBR 
} from '../utils/formatters';
import { oitivaService } from '../services/oitivaService';
import { ConfirmModal } from './ConfirmModal';
import { TermoNaoComparecimentoModal } from './TermoNaoComparecimentoModal';
import { hapticStatusChange, hapticToggle, hapticSelection } from '../utils/haptics';

interface OitivaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  oitiva: Oitiva | null;
  allOitivas?: Oitiva[];
  user?: UserProfile | null;
  onEdit: (oitiva: Oitiva) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: HearingStatus) => void;
  onToggleIntimationSent?: (id: string, nextStatus: boolean) => void;
  onReschedule?: (id: string, newDate: string, newTime: string, reason?: string) => Promise<void> | void;
  onClearPersonHistory?: (personName: string, cpf?: string) => Promise<void> | void;
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
  allOitivas = [],
  user,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleIntimationSent,
  onReschedule,
  onClearPersonHistory,
  onOpenPrintIntimacao,
  onOpenWhatsApp,
  onSyncCalendar,
  onSendGmail,
  onSaveDrive
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isTermoModalOpen, setIsTermoModalOpen] = useState(false);

  // Reschedule State
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Não compareceu na data anterior');
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // History expansion toggle
  const [showFullHistory, setShowFullHistory] = useState(false);

  if (!isOpen || !oitiva) return null;

  const statuses: HearingStatus[] = ['Agendada', 'Realizada', 'Remarcada', 'Não Compareceu', 'Cancelada'];

  // Resgata histórico completo da pessoa (todas as oitivas e reagendamentos da mesma pessoa)
  const personHistory = oitivaService.getPersonHistory(
    oitiva.personName,
    oitiva.cpf,
    allOitivas.length > 0 ? allOitivas : [oitiva]
  );

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

  const handleConfirmClearHistory = async () => {
    if (!oitiva) return;
    setIsClearingHistory(true);
    try {
      if (onClearPersonHistory) {
        await onClearPersonHistory(oitiva.personName, oitiva.cpf);
      } else {
        await oitivaService.clearPersonHistory(oitiva.personName, oitiva.cpf);
      }
      setShowClearHistoryConfirm(false);
    } catch (err) {
      console.error('Erro ao limpar histórico da pessoa:', err);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleStartReschedule = () => {
    setNewDate(oitiva.date || '');
    setNewTime(oitiva.time || '10:00');
    setRescheduleReason('Não compareceu na data anterior');
    setCustomReason('');
    setIsRescheduling(true);
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !oitiva) return;

    const finalReason = rescheduleReason === 'Outro' 
      ? (customReason.trim() || 'Remarcação avulsa')
      : rescheduleReason;

    setIsSubmittingReschedule(true);
    try {
      if (onReschedule) {
        await onReschedule(oitiva.id, newDate, newTime || oitiva.time, finalReason);
      } else {
        await oitivaService.reschedule(oitiva.id, newDate, newTime || oitiva.time, finalReason);
      }
      setIsRescheduling(false);
      onClose();
    } catch (err) {
      console.error('Erro ao remarcar oitiva:', err);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/85 backdrop-blur-sm overflow-hidden no-print"
      >
        <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-2xl sm:rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-purple-950/90 my-auto flex flex-col">
          
          {/* Header Compacto */}
          <div className="flex items-center justify-between p-3.5 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border-2 border-purple-400/60 flex items-center justify-center text-purple-200 shadow-md shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border-2 ${getRoleBadgeClasses(oitiva.role)}`}>
                    {oitiva.role || 'Oitiva'}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border-2 ${getStatusBadgeClasses(oitiva.status)}`}>
                    {oitiva.status}
                  </span>
                  {personHistory.timeline.length > 1 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-200 border border-indigo-400">
                      {personHistory.timeline.length} Registros Históricos
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5 truncate">
                  {oitiva.personName}
                </h2>
              </div>
            </div>

            {/* Ações do Header: Editar, Excluir e Fechar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                id="btn-edit-oitiva-header"
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(oitiva);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-500/70 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar Oitiva</span>
              </button>

              <button
                id="btn-delete-oitiva-header"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 sm:p-2 bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border-2 border-rose-600/70 hover:border-rose-400 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Excluir Oitiva"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="btn-close-detail-modal"
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 text-zinc-300 hover:text-white hover:bg-purple-950/60 border border-purple-900/40 rounded-xl transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-painel: Modal/Formulário de Remarcação Rápida */}
          {isRescheduling && (
            <div className="bg-[#1c1232] border-b-2 border-amber-500/60 p-4 sm:p-5 shrink-0 animate-in fade-in slide-in-from-top-2">
              <form onSubmit={handleConfirmReschedule} className="max-w-3xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                      Remarcar Oitiva de {oitiva.personName}
                    </h4>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsRescheduling(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">
                      Nova Data da Oitiva:
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full bg-[#110b20] border-2 border-amber-500/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">
                      Novo Horário:
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#110b20] border-2 border-amber-500/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 uppercase mb-1">
                      Motivo da Remarcação:
                    </label>
                    <select
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full bg-[#110b20] border-2 border-amber-500/80 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="Não compareceu na data anterior">Não compareceu na data anterior</option>
                      <option value="Pedido do Depoente / Defesa">Pedido do Depoente / Defesa</option>
                      <option value="Readequação de Pauta Cartorária">Readequação de Pauta Cartorária</option>
                      <option value="Servidor / Autoridade Policial em Diligência">Servidor / Autoridade em Diligência</option>
                      <option value="Outro">Outro motivo</option>
                    </select>
                  </div>
                </div>

                {rescheduleReason === 'Outro' && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                      Descreva o motivo:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Falta de energia na unidade policial, redesignação de sala..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="w-full bg-[#110b20] border border-amber-500/60 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#120d20] border border-zinc-700 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule || !newDate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmittingReschedule ? 'Remarcando...' : 'Confirmar e Atualizar Pauta'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Content: Layout Responsivo (Mobile Cards com Cores e Sombras vs Desktop 3-Colunas) */}
          <div className="p-3 sm:p-6 overflow-y-auto flex-1">
            
            {/* ========================================================================= */}
            {/* 1. VISUALIZAÇÃO MOBILE OTIMIZADA (lg:hidden)                                */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-3.5">
              
              {/* BLOCO 1 (MOBILE): STATUS DA OITIVA & CONTROLE RÁPIDO (DESTAQUE NO TOPO) */}
              <div className="bg-gradient-to-br from-[#1e153a] via-[#16102b] to-[#120c24] border-2 border-purple-500/60 rounded-2xl p-3.5 shadow-xl shadow-purple-950/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-purple-800/40">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Status da Oitiva
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 ${getStatusBadgeClasses(oitiva.status)} shadow-sm`}>
                    {oitiva.status}
                  </span>
                </div>

                {/* Toque Rápido para Mudar Status */}
                <div>
                  <span className="text-[10px] font-bold text-purple-300/80 uppercase block mb-1.5">
                    Alterar Status (Toque Rápido):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {statuses.map((st) => {
                      const isActive = oitiva.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            hapticStatusChange();
                            onStatusChange(oitiva.id, st);
                          }}
                          className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 text-center ${
                            isActive
                              ? `${getStatusBadgeClasses(st)} shadow-md ring-2 ring-purple-300 font-black scale-[1.02]`
                              : 'bg-[#120d20] border-purple-900/50 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{st}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* PAINEL INTIMAÇÃO & REMARCAÇÃO (2 CARDS LADO A LADO) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-800/30">
                  {/* Status da Intimação */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticToggle();
                      if (onToggleIntimationSent) {
                        onToggleIntimationSent(oitiva.id, !oitiva.intimationSent);
                      }
                    }}
                    className={`p-2.5 rounded-xl border-2 flex flex-col justify-between transition-all duration-200 cursor-pointer text-left shadow-md active:scale-95 min-h-[68px] ${
                      oitiva.intimationSent
                        ? 'bg-gradient-to-br from-emerald-950/90 to-teal-950/90 border-emerald-400/90 text-emerald-200 shadow-emerald-950/60'
                        : 'bg-gradient-to-br from-amber-950/70 to-orange-950/70 border-amber-500/70 text-amber-200 shadow-amber-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] uppercase font-black tracking-wider text-zinc-300">
                        Intimação
                      </span>
                      {oitiva.intimationSent ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-xs font-black text-white block leading-tight">
                        {oitiva.intimationSent ? 'Enviada' : 'Pendente'}
                      </span>
                      <span className="text-[9px] text-zinc-400 block">Toque p/ alternar</span>
                    </div>
                  </button>

                  {/* Remarcar Oitiva */}
                  <button
                    type="button"
                    onClick={handleStartReschedule}
                    className="p-2.5 rounded-xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 text-amber-200 flex flex-col justify-between transition-all duration-200 cursor-pointer text-left shadow-md shadow-amber-950/60 active:scale-95 min-h-[68px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[9px] uppercase font-black tracking-wider text-amber-300">
                        Pauta
                      </span>
                      <RotateCcw className="w-4 h-4 text-amber-300 shrink-0" />
                    </div>
                    <div className="mt-1">
                      <span className="text-xs font-black text-white block leading-tight">
                        Remarcar
                      </span>
                      <span className="text-[9px] text-amber-300/80 block">Nova data/hora</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* BLOCO 2 (MOBILE): AÇÕES PRINCIPAIS & DOCUMENTOS */}
              <div className="space-y-2">
                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(oitiva)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/80 rounded-xl text-xs font-black shadow-lg shadow-emerald-950/70 transition-all cursor-pointer active:scale-95 min-h-[44px]"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp (Mensagem + PDF Oficial)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTermoModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 hover:from-rose-900 hover:to-rose-800 text-rose-100 hover:text-white border-2 border-rose-500/80 rounded-xl text-xs font-black shadow-lg shadow-rose-950/70 transition-all cursor-pointer active:scale-95 min-h-[44px]"
                >
                  <FileText className="w-4 h-4 text-rose-300" />
                  <span>Gerar Termo de Não Comparecimento (PDF)</span>
                </button>

                {onOpenPrintIntimacao && (
                  <button
                    type="button"
                    onClick={onOpenPrintIntimacao}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-400/70 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 min-h-[42px]"
                  >
                    <FileText className="w-4 h-4 text-purple-300" />
                    <span>Download da Intimação (PDF)</span>
                  </button>
                )}
              </div>

              {/* BLOCO 3 (MOBILE): AGENDAMENTO & PROCEDIMENTO POLICIAL */}
              <div className="bg-gradient-to-br from-[#151128] to-[#100c20] border-2 border-indigo-500/40 rounded-2xl p-3.5 shadow-lg shadow-indigo-950/40 space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-indigo-900/40">
                  <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Agendamento & Procedimento
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#100d1e] p-2.5 rounded-xl border border-indigo-500/30">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Data da Oitiva:</span>
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{formatDateBR(oitiva.date)}</span>
                    </div>
                  </div>
                  <div className="bg-[#100d1e] p-2.5 rounded-xl border border-indigo-500/30">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">Horário:</span>
                    <div className="flex items-center gap-1.5 text-purple-300 font-mono font-bold text-xs">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{oitiva.time ? `${oitiva.time}h` : 'A definir'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t border-indigo-900/30 space-y-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Procedimento Policial:</span>
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{oitiva.procedureType || 'Procedimento'} nº {oitiva.procedureNumber || 'S/N'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block">Formato & Local:</span>
                    {oitiva.modality === 'Videoconferência' ? (
                      <div className="flex items-center gap-1.5 text-blue-300 font-medium mt-0.5">
                        <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Videoconferência:</span>
                        {oitiva.locationOrLink && (
                          <a 
                            href={oitiva.locationOrLink.startsWith('http') ? oitiva.locationOrLink : `https://${oitiva.locationOrLink}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-purple-400 underline truncate max-w-[180px] text-xs"
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
              </div>

              {/* BLOCO 4 (MOBILE): QUALIFICAÇÃO DA PESSOA / DEPOENTE */}
              <div className="bg-gradient-to-br from-[#18112c] to-[#120d22] border-2 border-purple-700/40 rounded-2xl p-3.5 shadow-lg shadow-purple-950/40 space-y-3">
                <div className="flex items-center gap-2 pb-1.5 border-b border-purple-800/30">
                  <User className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Qualificação da Pessoa
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block">Nome Completo:</span>
                  <span className="font-black text-white text-sm block">{oitiva.personName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-purple-900/30">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">CPF:</span>
                    <span className="font-mono text-zinc-200 text-xs font-medium">{oitiva.cpf || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">RG / Órgão:</span>
                    <span className="text-zinc-200 text-xs">{oitiva.rg || 'Não informado'}</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-purple-900/30 space-y-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Telefone / WhatsApp:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold text-xs">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{oitiva.phone || 'Não informado'}</span>
                      </div>
                      {oitiva.phone && onOpenWhatsApp && (
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(oitiva)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 rounded-lg active:scale-95"
                        >
                          Chamar WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  {oitiva.email && (
                    <div>
                      <span className="text-[10px] text-zinc-400 block">E-mail:</span>
                      <div className="flex items-center gap-1.5 text-zinc-300 truncate text-xs">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="truncate">{oitiva.email}</span>
                      </div>
                    </div>
                  )}

                  {(oitiva.address || oitiva.neighborhood || oitiva.city) && (
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Endereço Residencial:</span>
                      <p className="text-zinc-300 text-xs leading-relaxed">
                        {[oitiva.address, oitiva.neighborhood, oitiva.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCO 5 (MOBILE): EQUIPE POLICIAL RESPONSÁVEL */}
              <div className="bg-[#161026] border border-purple-800/40 p-3 rounded-2xl space-y-1.5 text-xs shadow-md">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Equipe Policial</span>
                {oitiva.officerName && (
                  <div className="flex items-center gap-1.5 text-zinc-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-zinc-400 text-[11px]">DPC / Autoridade:</span>
                    <strong className="text-white text-xs truncate">{oitiva.officerName}</strong>
                  </div>
                )}
                {oitiva.clerkName && (
                  <div className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-zinc-500">Escrivão(ã) / OIP:</span>
                    <span className="truncate">{oitiva.clerkName}</span>
                  </div>
                )}
              </div>

              {/* BLOCO 6 (MOBILE): HISTÓRICO DA PESSOA & OBSERVAÇÕES */}
              <div className="bg-[#171326] p-3.5 rounded-2xl border border-purple-900/40 text-xs space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-1.5 cursor-pointer select-none flex-1 min-w-0" 
                    onClick={() => setShowFullHistory(!showFullHistory)}
                  >
                    <History className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                      Histórico desta Pessoa ({personHistory.timeline.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {personHistory.timeline.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowClearHistoryConfirm(true);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-600/50 text-[10px] font-bold"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}

                    <button 
                      type="button" 
                      onClick={() => setShowFullHistory(!showFullHistory)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {showFullHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {showFullHistory && (
                  <div className="space-y-2 pt-1 border-t border-purple-900/30 max-h-48 overflow-y-auto pr-1">
                    {personHistory.timeline.length > 0 ? (
                      personHistory.timeline.map((item) => (
                        <div key={item.id} className="p-2 rounded-xl bg-[#100c1e] border border-purple-900/30 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                            <span className="font-semibold text-purple-300">{item.action}</span>
                            <span>{formatDateBR(item.dateStr)} {item.timeStr ? `às ${item.timeStr}h` : ''}</span>
                          </div>
                          <p className="text-zinc-200 text-[10px] leading-tight">{item.details}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-400 py-2 text-center">Nenhum evento registrado no histórico.</p>
                    )}
                  </div>
                )}

                {oitiva.notes && (
                  <div className="pt-2 border-t border-purple-900/30">
                    <span className="text-[10px] font-semibold text-zinc-400 block mb-0.5">Observações:</span>
                    <p className="text-zinc-300 text-[11px] whitespace-pre-wrap leading-relaxed">
                      {oitiva.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* BLOCO 7 (MOBILE): GOOGLE WORKSPACE */}
              <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/30 space-y-2 shadow-md">
                <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Google Workspace:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSyncCalendar && onSyncCalendar(oitiva)}
                    className="p-2 bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1.5 text-center active:scale-95"
                  >
                    <CalendarIcon className="w-4 h-4 text-purple-400" />
                    <span>Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSendGmail && onSendGmail(oitiva)}
                    className="p-2 bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1.5 text-center active:scale-95"
                  >
                    <Mail className="w-4 h-4 text-rose-400" />
                    <span>Gmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                    className="p-2 bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1.5 text-center active:scale-95"
                  >
                    <HardDrive className="w-4 h-4 text-amber-400" />
                    <span>Drive</span>
                  </button>
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* 2. VISUALIZAÇÃO DESKTOP INTACTA (hidden lg:grid lg:grid-cols-12)             */}
            {/* ========================================================================= */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-5">
              
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
                      <span className="text-zinc-400 text-[11px]">DPC / Autoridade:</span>
                      <strong className="text-white text-xs truncate">{oitiva.officerName}</strong>
                    </div>
                  )}
                  {oitiva.clerkName && (
                    <div className="flex items-center gap-1.5 text-zinc-300 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="text-zinc-500">Escrivão(ã) / OIP:</span>
                      <span className="truncate">{oitiva.clerkName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA 2: AGENDAMENTO, PROCEDIMENTO & HISTÓRICO (4 Cols) */}
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

                  {/* PAINEL DE HISTÓRICO DE OITIVAS DESTA PESSOA */}
                  <div className="bg-[#171326] p-3 rounded-2xl border border-purple-900/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer select-none flex-1 min-w-0" 
                        onClick={() => setShowFullHistory(!showFullHistory)}
                      >
                        <History className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                          Histórico desta Pessoa ({personHistory.timeline.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {personHistory.timeline.length > 0 && (
                          <button
                            id="btn-clear-person-history"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClearHistoryConfirm(true);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-600/50 hover:border-rose-400 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                            title="Limpar todo o histórico de remarcações e alterações desta pessoa"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Limpar Histórico</span>
                          </button>
                        )}

                        <button 
                          type="button" 
                          onClick={() => setShowFullHistory(!showFullHistory)}
                          className="text-zinc-400 hover:text-white p-1"
                          title={showFullHistory ? "Recolher histórico" : "Expandir histórico"}
                        >
                          {showFullHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {showFullHistory && (
                      <div className="space-y-2 pt-1 border-t border-purple-900/30 max-h-48 overflow-y-auto pr-1">
                        {personHistory.timeline.length > 0 ? (
                          personHistory.timeline.map((item) => (
                            <div key={item.id} className="p-2 rounded-xl bg-[#100c1e] border border-purple-900/30 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between text-zinc-400 text-[10px]">
                                <span className="font-semibold text-purple-300">{item.action}</span>
                                <span>{formatDateBR(item.dateStr)} {item.timeStr ? `às ${item.timeStr}h` : ''}</span>
                              </div>
                              <p className="text-zinc-200 text-[10px] leading-tight">{item.details}</p>
                              {item.procedureNumber && (
                                <span className="text-[9px] text-zinc-400 block">Proc: {item.procedureNumber}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-zinc-400 py-2 text-center">Nenhum evento registrado no histórico.</p>
                        )}
                      </div>
                    )}
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
                            onClick={() => {
                              hapticStatusChange();
                              onStatusChange(oitiva.id, st);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
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

                  {/* Botões Principais: WhatsApp, Mandado e Termo de Ausência */}
                  <div className="space-y-2">
                    <button
                      id="btn-open-termo-nao-comparecimento"
                      type="button"
                      onClick={() => setIsTermoModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 hover:from-rose-900 hover:to-rose-800 text-rose-100 hover:text-white border-2 border-rose-500/80 rounded-xl text-xs font-black shadow-md shadow-rose-950/70 transition-all cursor-pointer hover:scale-[1.01]"
                      title="Gerar Ofício e Termo de Não Comparecimento em PDF com assinaturas de 1 DPC e 2 OIP"
                    >
                      <FileText className="w-4 h-4 text-rose-300" />
                      <span>Gerar Termo de Não Comparecimento (PDF)</span>
                    </button>

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
                        className="p-2 bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border border-purple-500/30 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer hover:border-purple-400"
                        title="Google Calendar"
                      >
                        <CalendarIcon className="w-4 h-4 text-purple-400" />
                        <span>Calendar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendGmail && onSendGmail(oitiva)}
                        className="p-2 bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border border-rose-500/30 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer hover:border-rose-400"
                        title="Gmail"
                      >
                        <Mail className="w-4 h-4 text-rose-400" />
                        <span>Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                        className="p-2 bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border border-amber-500/30 rounded-xl text-[11px] font-semibold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer hover:border-amber-400"
                        title="Google Drive"
                      >
                        <HardDrive className="w-4 h-4 text-amber-400" />
                        <span>Drive</span>
                      </button>
                    </div>
                  </div>

                  {/* PAINEL INTIMAÇÃO & REMARCAÇÃO (LOGO ABAIXO DO GOOGLE WORKSPACE, LADO A LADO COM ESPAÇO COMPLETO) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-purple-900/40">
                    {/* Botão 1: Status da Intimação (Interativo) */}
                    <button
                      id="btn-toggle-intimacao-status"
                      type="button"
                      onClick={() => {
                        hapticToggle();
                        if (onToggleIntimationSent) {
                          onToggleIntimationSent(oitiva.id, !oitiva.intimationSent);
                        }
                      }}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all duration-200 cursor-pointer text-left group shadow-md active:scale-98 ${
                        oitiva.intimationSent
                          ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/80 border-emerald-400/80 hover:border-emerald-300 shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                          : 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/60 hover:border-amber-400 shadow-amber-950/40'
                      }`}
                      title="Clique para alternar o status da intimação (Enviada / Pendente)"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
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
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase font-black tracking-wider block ${
                            oitiva.intimationSent ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            Status Intimação
                          </span>
                          <span className="text-xs font-black text-white block">
                            {oitiva.intimationSent ? 'Enviada' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 ml-1">
                        <span className={`px-2 py-1 text-[9px] font-black rounded-lg tracking-wider uppercase transition-all shadow-sm ${
                          oitiva.intimationSent
                            ? 'bg-emerald-500 text-emerald-950 group-hover:bg-emerald-400'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/50 group-hover:bg-amber-500/30'
                        }`}>
                          {oitiva.intimationSent ? 'OK' : 'Mudar'}
                        </span>
                      </div>
                    </button>

                    {/* Botão 2: Remarcar Oitiva (Ao lado do Status da Intimação, abaixo do Google Workspace) */}
                    <button
                      id="btn-remarcar-oitiva"
                      type="button"
                      onClick={handleStartReschedule}
                      className="p-3 rounded-2xl border-2 border-amber-400/90 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 hover:from-amber-900 hover:to-amber-800 flex items-center justify-between transition-all duration-200 cursor-pointer text-left group shadow-md shadow-amber-950/60 ring-1 ring-amber-500/40 hover:scale-[1.01]"
                      title="Remarcar esta oitiva para nova data/hora e salvar no histórico"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/30 border-2 border-amber-400 text-amber-300 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-45">
                          <RotateCcw className="w-5 h-5 text-amber-300" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">
                            Pauta & Agenda
                          </span>
                          <span className="text-xs font-black text-white block">
                            Remarcar
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 ml-1">
                        <span className="px-2 py-1 text-[9px] font-black rounded-lg tracking-wider uppercase bg-amber-400 text-amber-950 shadow-sm group-hover:bg-amber-300">
                          Remarcar
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0 text-xs">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>1ª Delegacia Metropolitana de Maracanaú • Sistema Oficial</span>
            </div>

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

      {/* Modal de Confirmação para Limpeza de Histórico da Pessoa */}
      <ConfirmModal
        isOpen={showClearHistoryConfirm}
        onClose={() => setShowClearHistoryConfirm(false)}
        onConfirm={handleConfirmClearHistory}
        title="Limpar Histórico da Pessoa?"
        message={`Confirma a exclusão de todo o histórico de eventos, remarcações e intimações registradas para "${oitiva.personName}"? Os dados cadastrais da oitiva atual serão mantidos.`}
        confirmText="Sim, Limpar Histórico"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isClearingHistory}
      />

      {/* Modal para Geração do Termo de Não Comparecimento Oficial PCCE */}
      <TermoNaoComparecimentoModal
        isOpen={isTermoModalOpen}
        onClose={() => setIsTermoModalOpen(false)}
        oitiva={oitiva}
        allOitivas={allOitivas}
        user={user}
        onMarkStatusAsAbsent={async (id) => {
          await onStatusChange(id, 'Não Compareceu');
        }}
      />
    </>
  );
};
