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
import { useTheme } from '../context/ThemeContext';

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
  onClearOitivaHistory?: (id: string) => Promise<void> | void;
  onClearPersonHistory?: (personName: string, cpf?: string, oitivaId?: string) => Promise<void> | void;
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
  onClearOitivaHistory,
  onClearPersonHistory,
  onOpenPrintIntimacao,
  onOpenWhatsApp,
  onSyncCalendar,
  onSendGmail,
  onSaveDrive
}) => {
  const { isDark } = useTheme();
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

  // Histórico isolado e exclusivo DESTA oitiva específica
  const oitivaHistoryItems = Array.isArray(oitiva.history) ? oitiva.history : [];
  const oitivaTimeline = oitivaService.getOitivaTimeline(oitiva);

  // Verificação de segurança: outras oitivas desta mesma pessoa no sistema (que permanecem intactas)
  const otherOitivasForPerson = allOitivas.filter(o => 
    o.id !== oitiva.id && (
      (oitiva.cpf && o.cpf && oitiva.cpf.replace(/\D/g, '') === o.cpf.replace(/\D/g, '')) ||
      (oitiva.personName && o.personName && oitiva.personName.trim().toLowerCase() === o.personName.trim().toLowerCase())
    )
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
      if (onClearOitivaHistory) {
        await onClearOitivaHistory(oitiva.id);
      } else if (onClearPersonHistory) {
        await onClearPersonHistory(oitiva.personName, oitiva.cpf, oitiva.id);
      } else {
        await oitivaService.clearOitivaHistory(oitiva.id);
      }
      setShowClearHistoryConfirm(false);
    } catch (err) {
      console.error('Erro ao limpar histórico da oitiva:', err);
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
        <div className={`${isDark ? 'bg-[#120f1e] border-purple-600/70 shadow-purple-950/90' : 'bg-white border-slate-300 shadow-slate-400/40 text-slate-900'} border-2 rounded-2xl sm:rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl my-auto flex flex-col`}>
          
          {/* Header Compacto */}
          <div className={`flex items-center justify-between p-3.5 sm:p-5 border-b-2 ${isDark ? 'border-purple-900/50 bg-[#161226]' : 'border-slate-200 bg-slate-50 text-slate-900'} shrink-0`}>
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${isDark ? 'bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/60 text-purple-200' : 'bg-purple-100 border-purple-400 text-purple-950'} border-2 flex items-center justify-center shadow-md shrink-0`}>
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
                  {oitivaHistoryItems.length > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'bg-indigo-950 text-indigo-200 border-indigo-400' : 'bg-indigo-100 text-indigo-950 border-indigo-300'}`}>
                      {oitivaHistoryItems.length} {oitivaHistoryItems.length === 1 ? 'Alteração Registrada' : 'Alterações Registradas'}
                    </span>
                  )}
                </div>
                <h2 className={`text-sm sm:text-base font-bold tracking-tight mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
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
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 ${isDark ? 'bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-purple-500/70' : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-400'} border-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar Oitiva</span>
              </button>

              <button
                id="btn-delete-oitiva-header"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-1.5 sm:p-2 ${isDark ? 'bg-rose-950/70 hover:bg-rose-600 text-rose-300 hover:text-white border-rose-600/70 hover:border-rose-400' : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-400'} border-2 rounded-xl transition-all cursor-pointer shadow-sm`}
                title="Excluir Oitiva"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="btn-close-detail-modal"
                type="button"
                onClick={onClose}
                className={`p-1.5 sm:p-2 ${isDark ? 'text-zinc-300 hover:text-white hover:bg-purple-950/60 border-purple-900/40' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200 border-slate-300'} border rounded-xl transition-colors cursor-pointer`}
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub-painel: Modal/Formulário de Remarcação Rápida */}
          {isRescheduling && (
            <div className={`${isDark ? 'bg-[#1c1232] border-amber-500/60' : 'bg-amber-50 border-amber-300'} border-b-2 p-4 sm:p-5 shrink-0 animate-in fade-in slide-in-from-top-2`}>
              <form onSubmit={handleConfirmReschedule} className="max-w-3xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                    <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-amber-950'}`}>
                      Remarcar Oitiva de {oitiva.personName}
                    </h4>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setIsRescheduling(false)}
                    className={`text-xs font-bold ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                      Nova Data da Oitiva:
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                        isDark 
                          ? 'bg-[#110b20] border-2 border-amber-500/80 text-white' 
                          : 'bg-white border-2 border-amber-400 text-slate-900 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                      Novo Horário:
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                        isDark 
                          ? 'bg-[#110b20] border-2 border-amber-500/80 text-white' 
                          : 'bg-white border-2 border-amber-400 text-slate-900 shadow-sm'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                      Motivo da Remarcação:
                    </label>
                    <select
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                        isDark 
                          ? 'bg-[#110b20] border-2 border-amber-500/80 text-white' 
                          : 'bg-white border-2 border-amber-400 text-slate-900 shadow-sm'
                      }`}
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
                    <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      Descreva o motivo:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Falta de energia na unidade policial, redesignação de sala..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className={`w-full rounded-xl px-3 py-1.5 text-xs ${
                        isDark 
                          ? 'bg-[#110b20] border border-amber-500/60 text-white' 
                          : 'bg-white border border-amber-400 text-slate-900 shadow-sm'
                      }`}
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRescheduling(false)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold ${
                      isDark 
                        ? 'text-zinc-300 hover:text-white bg-[#120d20] border border-zinc-700' 
                        : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300 shadow-sm'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule || !newDate}
                    className={`flex items-center gap-1.5 px-4 py-2 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                      isDark 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black' 
                        : 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500'
                    }`}
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
              <div className={`${isDark ? 'bg-gradient-to-br from-[#1e153a] via-[#16102b] to-[#120c24] border-purple-500/60 shadow-purple-950/80' : 'bg-slate-50 border-purple-200 shadow-slate-200'} border-2 rounded-2xl p-3.5 shadow-xl space-y-3`}>
                <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-purple-800/40' : 'border-purple-200'}`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Status da Oitiva
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 ${getStatusBadgeClasses(oitiva.status)} shadow-sm`}>
                    {oitiva.status}
                  </span>
                </div>

                {/* Toque Rápido para Mudar Status */}
                <div>
                  <span className={`text-[10px] font-bold uppercase block mb-1.5 ${isDark ? 'text-purple-300/80' : 'text-slate-700'}`}>
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
                              : isDark 
                                ? 'bg-[#120d20] border-purple-900/50 text-zinc-400 hover:text-zinc-200'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
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
                <div className={`grid grid-cols-2 gap-2 pt-1 border-t ${isDark ? 'border-purple-800/30' : 'border-purple-200'}`}>
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
                        ? isDark 
                          ? 'bg-gradient-to-br from-emerald-950/90 to-teal-950/90 border-emerald-400/90 text-emerald-200 shadow-emerald-950/60'
                          : 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-emerald-200/50'
                        : isDark
                          ? 'bg-gradient-to-br from-amber-950/70 to-orange-950/70 border-amber-500/70 text-amber-200 shadow-amber-950/40'
                          : 'bg-amber-50 border-amber-400 text-amber-950 shadow-amber-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[9px] uppercase font-black tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                        Intimação
                      </span>
                      {oitiva.intimationSent ? (
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} />
                      ) : (
                        <AlertCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
                      )}
                    </div>
                    <div className="mt-1">
                      <span className={`text-xs font-black block leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {oitiva.intimationSent ? 'Enviada' : 'Pendente'}
                      </span>
                      <span className={`text-[9px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Toque p/ alternar</span>
                    </div>
                  </button>

                  {/* Remarcar Oitiva */}
                  <button
                    type="button"
                    onClick={handleStartReschedule}
                    className={`p-2.5 rounded-xl border-2 flex flex-col justify-between transition-all duration-200 cursor-pointer text-left shadow-md active:scale-95 min-h-[68px] ${
                      isDark 
                        ? 'border-amber-400/90 bg-gradient-to-br from-amber-950 via-amber-900 to-amber-950 text-amber-200 shadow-amber-950/60'
                        : 'border-amber-400 bg-amber-50 text-amber-950 shadow-amber-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[9px] uppercase font-black tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                        Pauta
                      </span>
                      <RotateCcw className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-700'}`} />
                    </div>
                    <div className="mt-1">
                      <span className={`text-xs font-black block leading-tight ${isDark ? 'text-white' : 'text-amber-950'}`}>
                        Remarcar
                      </span>
                      <span className={`text-[9px] block ${isDark ? 'text-amber-300/80' : 'text-amber-800'}`}>Nova data/hora</span>
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
                    className={`w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer active:scale-95 min-h-[44px] ${
                      isDark 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/80 shadow-emerald-950/70'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-2 border-emerald-400 shadow-emerald-200/60'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp (Mensagem + PDF Oficial)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTermoModalOpen(true)}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer active:scale-95 min-h-[44px] ${
                    isDark 
                      ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 hover:from-rose-900 hover:to-rose-800 text-rose-100 hover:text-white border-2 border-rose-500/80 shadow-rose-950/70'
                      : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-2 border-rose-400 shadow-rose-200/60'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />
                  <span>Gerar Termo de Não Comparecimento (PDF)</span>
                </button>

                {onOpenPrintIntimacao && (
                  <button
                    type="button"
                    onClick={onOpenPrintIntimacao}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 min-h-[42px] ${
                      isDark 
                        ? 'bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-400/70'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-2 border-purple-400'
                    }`}
                  >
                    <FileText className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                    <span>Download da Intimação (PDF)</span>
                  </button>
                )}
              </div>

              {/* BLOCO 3 (MOBILE): AGENDAMENTO & PROCEDIMENTO POLICIAL */}
              <div className={`${isDark ? 'bg-gradient-to-br from-[#151128] to-[#100c20] border-indigo-500/40 shadow-indigo-950/40' : 'bg-slate-50 border-slate-200 shadow-slate-200'} border-2 rounded-2xl p-3.5 space-y-3 shadow-lg`}>
                <div className={`flex items-center gap-2 pb-1.5 border-b ${isDark ? 'border-indigo-900/40' : 'border-slate-200'}`}>
                  <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Agendamento & Procedimento
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className={`${isDark ? 'bg-[#100d1e] border-indigo-500/30' : 'bg-white border-slate-200 shadow-sm'} p-2.5 rounded-xl border`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Data da Oitiva:</span>
                    <div className={`flex items-center gap-1.5 font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <CalendarIcon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span>{formatDateBR(oitiva.date)}</span>
                    </div>
                  </div>
                  <div className={`${isDark ? 'bg-[#100d1e] border-indigo-500/30' : 'bg-white border-slate-200 shadow-sm'} p-2.5 rounded-xl border`}>
                    <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Horário:</span>
                    <div className={`flex items-center gap-1.5 font-mono font-bold text-xs ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>
                      <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span>{oitiva.time ? `${oitiva.time}h` : 'A definir'}</span>
                    </div>
                  </div>
                </div>

                <div className={`pt-1 border-t space-y-2 ${isDark ? 'border-indigo-900/30' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Procedimento Policial:</span>
                    <div className={`flex items-center gap-1.5 font-bold text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <FileText className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span>{oitiva.procedureType || 'Procedimento'} nº {oitiva.procedureNumber || 'S/N'}</span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Formato & Local:</span>
                    {oitiva.modality === 'Videoconferência' ? (
                      <div className={`flex items-center gap-1.5 font-medium mt-0.5 ${isDark ? 'text-blue-300' : 'text-blue-950'}`}>
                        <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Videoconferência:</span>
                        {oitiva.locationOrLink && (
                          <a 
                            href={oitiva.locationOrLink.startsWith('http') ? oitiva.locationOrLink : `https://${oitiva.locationOrLink}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className={`underline truncate max-w-[180px] text-xs ${isDark ? 'text-purple-400' : 'text-purple-700'}`}
                          >
                            {oitiva.locationOrLink}
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className={`flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-900'}`}>{oitiva.modality || 'Presencial'}:</span>
                        <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{oitiva.locationOrLink || 'Sala de Oitivas / Cartório'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCO 4 (MOBILE): QUALIFICAÇÃO DA PESSOA / DEPOENTE */}
              <div className={`${isDark ? 'bg-gradient-to-br from-[#18112c] to-[#120d22] border-purple-700/40 shadow-purple-950/40' : 'bg-slate-50 border-slate-200 shadow-slate-200'} border-2 rounded-2xl p-3.5 space-y-3 shadow-lg`}>
                <div className={`flex items-center gap-2 pb-1.5 border-b ${isDark ? 'border-purple-800/30' : 'border-slate-200'}`}>
                  <User className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Qualificação da Pessoa
                  </span>
                </div>

                <div>
                  <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Nome Completo:</span>
                  <span className={`font-black text-sm block ${isDark ? 'text-white' : 'text-slate-900'}`}>{oitiva.personName}</span>
                </div>

                <div className={`grid grid-cols-2 gap-2 pt-1 border-t ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>CPF:</span>
                    <span className={`font-mono text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{oitiva.cpf || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>RG / Órgão:</span>
                    <span className={`text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{oitiva.rg || 'Não informado'}</span>
                  </div>
                </div>

                <div className={`pt-1 border-t space-y-2 ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                  <div>
                    <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Telefone / WhatsApp:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className={`flex items-center gap-1.5 font-mono font-bold text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{oitiva.phone || 'Não informado'}</span>
                      </div>
                      {oitiva.phone && onOpenWhatsApp && (
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(oitiva)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-lg active:scale-95 ${
                            isDark 
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' 
                              : 'bg-emerald-100 text-emerald-950 border border-emerald-400'
                          }`}
                        >
                          Chamar WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  {oitiva.email && (
                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>E-mail:</span>
                      <div className={`flex items-center gap-1.5 truncate text-xs ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{oitiva.email}</span>
                      </div>
                    </div>
                  )}

                  {(oitiva.address || oitiva.neighborhood || oitiva.city) && (
                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Endereço Residencial:</span>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        {[oitiva.address, oitiva.neighborhood, oitiva.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BLOCO 5 (MOBILE): EQUIPE POLICIAL RESPONSÁVEL */}
              <div className={`${isDark ? 'bg-[#161026] border-purple-800/40' : 'bg-slate-50 border-slate-200'} border p-3 rounded-2xl space-y-1.5 text-xs shadow-md`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>Equipe Policial</span>
                {oitiva.officerName && (
                  <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>DPC / Autoridade:</span>
                    <strong className={`text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{oitiva.officerName}</strong>
                  </div>
                )}
                {oitiva.clerkName && (
                  <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Escrivão(ã) / OIP:</span>
                    <span className="truncate font-medium">{oitiva.clerkName}</span>
                  </div>
                )}
              </div>

              {/* BLOCO 6 (MOBILE): HISTÓRICO DESTA OITIVA & OBSERVAÇÕES */}
              <div className={`${isDark ? 'bg-[#171326] border-purple-900/40' : 'bg-slate-50 border-slate-200'} p-3.5 rounded-2xl border text-xs space-y-2 shadow-md`}>
                <div className="flex items-center justify-between gap-3">
                  {/* Título clicável para expandir/recolher histórico */}
                  <button
                    type="button"
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 text-left group py-0.5 rounded-lg hover:bg-purple-900/20 px-1 -mx-1 transition-colors"
                    title={showFullHistory ? "Recolher histórico desta oitiva" : "Expandir histórico desta oitiva"}
                  >
                    <History className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-indigo-400 group-hover:text-indigo-300' : 'text-indigo-600'}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${isDark ? 'text-white group-hover:text-purple-200' : 'text-slate-900 group-hover:text-purple-950'}`}>
                      Histórico Desta Oitiva ({oitivaHistoryItems.length})
                    </span>
                    {showFullHistory ? (
                      <ChevronUp className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-zinc-400 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                    ) : (
                      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-zinc-400 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                    )}
                  </button>

                  {/* Botão de lixeira isolado: apenas ícone para limpar histórico */}
                  {oitivaHistoryItems.length > 0 && (
                    <div className="flex items-center shrink-0 pl-2">
                      <button
                        id="btn-clear-oitiva-history-mobile"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowClearHistoryConfirm(true);
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm ${
                          isDark 
                            ? 'bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/40 hover:border-rose-500'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300'
                        }`}
                        title="Limpar histórico de remarcações desta oitiva"
                        aria-label="Limpar histórico desta oitiva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {otherOitivasForPerson.length > 0 && (
                  <p className={`text-[10px] pl-5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Nota: {otherOitivasForPerson.length} outro(s) agendamento(s) desta pessoa permanecem intactos.
                  </p>
                )}

                {showFullHistory && (
                  <div className={`space-y-2 pt-1 border-t max-h-48 overflow-y-auto pr-1 ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                    {oitivaTimeline.length > 0 ? (
                      oitivaTimeline.map((item) => (
                        <div key={item.id} className={`p-2 rounded-xl text-[11px] space-y-0.5 border ${isDark ? 'bg-[#100c1e] border-purple-900/30' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-semibold ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>{item.action}</span>
                            <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>{formatDateBR(item.dateStr)} {item.timeStr ? `às ${item.timeStr}h` : ''}</span>
                          </div>
                          <p className={`text-[10px] leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{item.details}</p>
                          {item.procedureNumber && (
                            <span className={`text-[9px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Proc: {item.procedureNumber}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className={`text-[10px] py-2 text-center ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Nenhum evento registrado no histórico desta oitiva.</p>
                    )}
                  </div>
                )}

                {oitiva.notes && (
                  <div className={`pt-2 border-t ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                    <span className={`text-[10px] font-semibold block mb-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Observações:</span>
                    <p className={`text-[11px] whitespace-pre-wrap leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      {oitiva.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* BLOCO 7 (MOBILE): GOOGLE WORKSPACE */}
              <div className={`${isDark ? 'bg-[#171326] border-purple-900/30' : 'bg-slate-50 border-slate-200'} p-3 rounded-2xl border space-y-2 shadow-md`}>
                <span className={`text-[10px] font-bold block uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Google Workspace:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSyncCalendar && onSyncCalendar(oitiva)}
                    className={`p-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1.5 text-center active:scale-95 border ${
                      isDark 
                        ? 'bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border-purple-500/30' 
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-300 shadow-sm'
                    }`}
                  >
                    <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>Calendar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSendGmail && onSendGmail(oitiva)}
                    className={`p-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1.5 text-center active:scale-95 border ${
                      isDark 
                        ? 'bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border-rose-500/30' 
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 shadow-sm'
                    }`}
                  >
                    <Mail className={`w-4 h-4 ${isDark ? 'text-rose-400' : 'text-rose-700'}`} />
                    <span>Gmail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                    className={`p-2 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1.5 text-center active:scale-95 border ${
                      isDark 
                        ? 'bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border-amber-500/30' 
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-sm'
                    }`}
                  >
                    <HardDrive className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
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
                  <div className={`flex items-center gap-2 pb-1 border-b ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                    <User className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Qualificação do Depoente
                    </h3>
                  </div>

                  {/* Card Dados Pessoais */}
                  <div className={`${isDark ? 'bg-[#171326] border-purple-900/30' : 'bg-slate-50 border-slate-200 text-slate-900'} p-3.5 rounded-2xl border space-y-2.5 text-xs shadow-sm`}>
                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Nome Completo:</span>
                      <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{oitiva.personName}</span>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 pt-1 border-t ${isDark ? 'border-purple-900/20' : 'border-slate-200'}`}>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>CPF:</span>
                        <span className={`font-mono text-xs font-medium ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{oitiva.cpf || 'Não informado'}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>RG / Órgão:</span>
                        <span className={`text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{oitiva.rg || 'Não informado'}</span>
                      </div>
                    </div>

                    <div className={`pt-1 border-t ${isDark ? 'border-purple-900/20' : 'border-slate-200'}`}>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Telefone / WhatsApp:</span>
                      <div className={`flex items-center gap-1.5 font-mono font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-950'}`}>
                        <Phone className="w-3.5 h-3.5" />
                        <span>{oitiva.phone || 'Não informado'}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>E-mail:</span>
                      <div className={`flex items-center gap-1.5 truncate ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{oitiva.email || 'Não informado'}</span>
                      </div>
                    </div>

                    {/* Endereço */}
                    {(oitiva.address || oitiva.neighborhood || oitiva.city) && (
                      <div className={`pt-2 border-t ${isDark ? 'border-purple-900/20' : 'border-slate-200'}`}>
                        <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Endereço Residencial:</span>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                          {[oitiva.address, oitiva.neighborhood, oitiva.city].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Responsáveis Policiais */}
                <div className={`${isDark ? 'bg-[#1a142e] border-purple-900/40' : 'bg-slate-50 border-slate-200 text-slate-900'} border p-3 rounded-2xl space-y-1.5 text-xs shadow-sm`}>
                  <span className={`text-[10px] font-bold block ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>Equipe Responsável</span>
                  {oitiva.officerName && (
                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>DPC / Autoridade:</span>
                      <strong className={`text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{oitiva.officerName}</strong>
                    </div>
                  )}
                  {oitiva.clerkName && (
                    <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Escrivão(ã) / OIP:</span>
                      <span className="truncate font-medium">{oitiva.clerkName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA 2: AGENDAMENTO, PROCEDIMENTO & HISTÓRICO (4 Cols) */}
              <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 pb-1 border-b ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                    <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Agendamento & Procedimento
                    </h3>
                  </div>

                  {/* Data, Horário e Procedimento */}
                  <div className={`${isDark ? 'bg-[#171326] border-purple-900/30' : 'bg-slate-50 border-slate-200 text-slate-900'} p-3.5 rounded-2xl border space-y-2.5 text-xs shadow-sm`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`${isDark ? 'bg-[#110d1e] border-purple-900/40' : 'bg-white border-slate-200 shadow-sm'} p-2.5 rounded-xl border`}>
                        <span className={`text-[10px] block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Data:</span>
                        <div className={`flex items-center gap-1.5 font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <CalendarIcon className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          <span>{formatDateBR(oitiva.date)}</span>
                        </div>
                      </div>
                      <div className={`${isDark ? 'bg-[#110d1e] border-purple-900/40' : 'bg-white border-slate-200 shadow-sm'} p-2.5 rounded-xl border`}>
                        <span className={`text-[10px] block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Horário:</span>
                        <div className={`flex items-center gap-1.5 font-mono font-bold text-xs ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>
                          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          <span>{oitiva.time ? `${oitiva.time}h` : 'A definir'}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`pt-1 border-t ${isDark ? 'border-purple-900/20' : 'border-slate-200'}`}>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Procedimento Policial:</span>
                      <div className={`flex items-center gap-1.5 font-semibold text-xs mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span>{oitiva.procedureType || 'Procedimento'} nº {oitiva.procedureNumber || 'S/N'}</span>
                      </div>
                    </div>

                    {/* Formato e Local */}
                    <div className={`pt-1 border-t ${isDark ? 'border-purple-900/20' : 'border-slate-200'}`}>
                      <span className={`text-[10px] block ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}>Formato & Localização:</span>
                      {oitiva.modality === 'Videoconferência' ? (
                        <div className={`flex items-center gap-1.5 font-medium mt-0.5 ${isDark ? 'text-blue-300' : 'text-blue-950'}`}>
                          <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Videoconferência</span>
                          {oitiva.locationOrLink && (
                            <a 
                              href={oitiva.locationOrLink.startsWith('http') ? oitiva.locationOrLink : `https://${oitiva.locationOrLink}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className={`underline truncate max-w-[150px] text-[11px] ${isDark ? 'text-purple-400' : 'text-purple-700'}`}
                            >
                              {oitiva.locationOrLink}
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                          <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-900'}`}>{oitiva.modality || 'Presencial'}:</span>
                          <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{oitiva.locationOrLink || 'Sala de Oitivas / Cartório'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PAINEL DE HISTÓRICO ISOLADO DESTA OITIVA */}
                  <div className={`${isDark ? 'bg-[#171326] border-purple-900/40' : 'bg-slate-50 border-slate-200 text-slate-900'} p-3 rounded-2xl border text-xs space-y-2 shadow-sm`}>
                    <div className="flex items-center justify-between gap-3">
                      {/* Título clicável para expandir/recolher histórico */}
                      <button
                        type="button"
                        onClick={() => setShowFullHistory(!showFullHistory)}
                        className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 text-left group py-0.5 rounded-lg hover:bg-purple-900/20 px-1 -mx-1 transition-colors"
                        title={showFullHistory ? "Recolher histórico desta oitiva" : "Expandir histórico desta oitiva"}
                      >
                        <History className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-indigo-400 group-hover:text-indigo-300' : 'text-indigo-600'}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${isDark ? 'text-white group-hover:text-purple-200' : 'text-slate-900 group-hover:text-purple-950'}`}>
                          Histórico Desta Oitiva ({oitivaHistoryItems.length})
                        </span>
                        {showFullHistory ? (
                          <ChevronUp className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-zinc-400 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                        ) : (
                          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-colors ${isDark ? 'text-zinc-400 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                        )}
                      </button>

                      {/* Botão de lixeira isolado: apenas ícone para limpar histórico */}
                      {oitivaHistoryItems.length > 0 && (
                        <div className="flex items-center shrink-0 pl-2">
                          <button
                            id="btn-clear-oitiva-history"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowClearHistoryConfirm(true);
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm ${
                              isDark 
                                ? 'bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-800/40 hover:border-rose-500'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-300'
                            }`}
                            title="Limpar histórico de remarcações desta oitiva"
                            aria-label="Limpar histórico desta oitiva"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {otherOitivasForPerson.length > 0 && (
                      <p className={`text-[10px] pl-5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        Nota: {otherOitivasForPerson.length} outro(s) agendamento(s) de "{oitiva.personName}" permanecem preservados e intactos.
                      </p>
                    )}

                    {showFullHistory && (
                      <div className={`space-y-2 pt-1 border-t max-h-48 overflow-y-auto pr-1 ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                        {oitivaTimeline.length > 0 ? (
                          oitivaTimeline.map((item) => (
                            <div key={item.id} className={`p-2 rounded-xl text-[11px] space-y-0.5 border ${isDark ? 'bg-[#100c1e] border-purple-900/30' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div className="flex items-center justify-between text-[10px]">
                                <span className={`font-semibold ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>{item.action}</span>
                                <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>{formatDateBR(item.dateStr)} {item.timeStr ? `às ${item.timeStr}h` : ''}</span>
                              </div>
                              <p className={`text-[10px] leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{item.details}</p>
                              {item.procedureNumber && (
                                <span className={`text-[9px] block ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Proc: {item.procedureNumber}</span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className={`text-[10px] py-2 text-center ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Nenhum evento registrado no histórico desta oitiva.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Observações */}
                  {oitiva.notes && (
                    <div className={`${isDark ? 'bg-[#171326] border-purple-900/30 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-800'} p-3 rounded-2xl border text-xs shadow-sm`}>
                      <span className={`text-[10px] font-semibold block mb-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Observações & Anotações:</span>
                      <p className="text-[11px] whitespace-pre-wrap leading-relaxed">
                        {oitiva.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUNA 3: STATUS & AÇÕES RÁPIDAS (4 Cols) */}
              <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 pb-1 border-b ${isDark ? 'border-purple-900/30' : 'border-slate-200'}`}>
                    <Shield className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Controle & Ações
                    </h3>
                  </div>

                  {/* Alterar Status */}
                  <div className={`${isDark ? 'bg-[#171326] border-purple-900/30' : 'bg-slate-50 border-slate-200 text-slate-900'} p-3 rounded-2xl border shadow-sm`}>
                    <p className={`text-[10px] font-semibold mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Alterar Status da Oitiva:</p>
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
                                : isDark
                                  ? 'bg-[#100d1c] border-purple-900/30 text-zinc-400 hover:text-zinc-200'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
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
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer hover:scale-[1.01] ${
                        isDark 
                          ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 hover:from-rose-900 hover:to-rose-800 text-rose-100 hover:text-white border-2 border-rose-500/80 shadow-rose-950/70'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-2 border-rose-400 shadow-rose-200/50'
                      }`}
                      title="Gerar Ofício e Termo de Não Comparecimento em PDF com assinaturas de 1 DPC e 1 OIP"
                    >
                      <FileText className={`w-4 h-4 ${isDark ? 'text-rose-300' : 'text-rose-700'}`} />
                      <span>Gerar Termo de Não Comparecimento (PDF)</span>
                    </button>

                    {onOpenWhatsApp && (
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(oitiva)}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-2 border-emerald-400/70 shadow-emerald-950/60'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-2 border-emerald-400 shadow-emerald-200/50'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>WhatsApp (Texto + PDF Oficial)</span>
                      </button>
                    )}

                    {onOpenPrintIntimacao && (
                      <button
                        type="button"
                        onClick={onOpenPrintIntimacao}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                          isDark 
                            ? 'bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white border-2 border-purple-400/80'
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-2 border-purple-400'
                        }`}
                      >
                        <FileText className={`w-4 h-4 ${isDark ? 'text-purple-300' : 'text-purple-700'}`} />
                        <span>Fazer Download da Intimação (PDF)</span>
                      </button>
                    )}
                  </div>

                  {/* Google Workspace */}
                  <div className={`${isDark ? 'bg-[#171326] border-purple-900/30' : 'bg-slate-50 border-slate-200 text-slate-900'} p-3 rounded-2xl border space-y-2 shadow-sm`}>
                    <span className={`text-[10px] font-bold block ${isDark ? 'text-zinc-400' : 'text-slate-700'}`}>Sincronização Google Workspace:</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSyncCalendar && onSyncCalendar(oitiva)}
                        className={`p-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer border ${
                          isDark 
                            ? 'bg-[#120d22] hover:bg-purple-900/40 text-purple-200 border-purple-500/30 hover:border-purple-400' 
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-300 shadow-sm'
                        }`}
                        title="Google Calendar"
                      >
                        <CalendarIcon className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                        <span>Calendar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSendGmail && onSendGmail(oitiva)}
                        className={`p-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer border ${
                          isDark 
                            ? 'bg-[#120d22] hover:bg-rose-950/40 text-rose-200 border-rose-500/30 hover:border-rose-400' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 shadow-sm'
                        }`}
                        title="Gmail"
                      >
                        <Mail className={`w-4 h-4 ${isDark ? 'text-rose-400' : 'text-rose-700'}`} />
                        <span>Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSaveDrive && onSaveDrive(oitiva)}
                        className={`p-2 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-1.5 text-center cursor-pointer border ${
                          isDark 
                            ? 'bg-[#120d22] hover:bg-amber-950/40 text-amber-200 border-amber-500/30 hover:border-amber-400' 
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-sm'
                        }`}
                        title="Google Drive"
                      >
                        <HardDrive className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
                        <span>Drive</span>
                      </button>
                    </div>
                  </div>

                  {/* PAINEL INTIMAÇÃO & REMARCAÇÃO (LOGO ABAIXO DO GOOGLE WORKSPACE, LADO A LADO COM ESPAÇO COMPLETO) */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t ${isDark ? 'border-purple-900/40' : 'border-purple-200'}`}>
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
                          ? isDark 
                            ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/80 border-emerald-400/80 hover:border-emerald-300 shadow-emerald-950/60 ring-1 ring-emerald-500/40'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 shadow-emerald-200/50 text-emerald-950'
                          : isDark
                            ? 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/60 hover:border-amber-400 shadow-amber-950/40'
                            : 'bg-amber-50 hover:bg-amber-100 border-amber-400 shadow-amber-200/50 text-amber-950'
                      }`}
                      title="Clique para alternar o status da intimação (Enviada / Pendente)"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                          oitiva.intimationSent
                            ? isDark ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300' : 'bg-emerald-200 border-2 border-emerald-500 text-emerald-950'
                            : isDark ? 'bg-amber-500/20 border border-amber-400 text-amber-300' : 'bg-amber-200 border border-amber-500 text-amber-950'
                        }`}>
                          {oitiva.intimationSent ? (
                            <CheckCircle2 className={`w-5 h-5 ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`} />
                          ) : (
                            <AlertCircle className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-800'}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase font-black tracking-wider block ${
                            oitiva.intimationSent 
                              ? (isDark ? 'text-emerald-400' : 'text-emerald-900') 
                              : (isDark ? 'text-amber-400' : 'text-amber-900')
                          }`}>
                            Status Intimação
                          </span>
                          <span className={`text-xs font-black block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {oitiva.intimationSent ? 'Enviada' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 ml-1">
                        <span className={`px-2 py-1 text-[9px] font-black rounded-lg tracking-wider uppercase transition-all shadow-sm ${
                          oitiva.intimationSent
                            ? isDark ? 'bg-emerald-500 text-emerald-950 group-hover:bg-emerald-400' : 'bg-emerald-300 text-emerald-950 border border-emerald-400'
                            : isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 group-hover:bg-amber-500/30' : 'bg-amber-200 text-amber-950 border border-amber-400'
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
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all duration-200 cursor-pointer text-left group shadow-md hover:scale-[1.01] ${
                        isDark 
                          ? 'border-amber-400/90 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 hover:from-amber-900 hover:to-amber-800 text-amber-200 shadow-amber-950/60 ring-1 ring-amber-500/40' 
                          : 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 shadow-amber-200/50'
                      }`}
                      title="Remarcar esta oitiva para nova data/hora e salvar no histórico"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-45 ${
                          isDark ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-300' : 'bg-amber-200 border-2 border-amber-400 text-amber-950'
                        }`}>
                          <RotateCcw className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="min-w-0">
                          <span className={`text-[10px] uppercase font-black tracking-wider block ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                            Pauta & Agenda
                          </span>
                          <span className={`text-xs font-black block ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            Remarcar
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0 ml-1">
                        <span className={`px-2 py-1 text-[9px] font-black rounded-lg tracking-wider uppercase shadow-sm ${
                          isDark ? 'bg-amber-400 text-amber-950 group-hover:bg-amber-300' : 'bg-amber-300 text-amber-950 border border-amber-400'
                        }`}>
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
          <div className={`p-3 sm:p-4 border-t-2 ${isDark ? 'border-purple-900/50 bg-[#161226]' : 'border-slate-200 bg-slate-50 text-slate-800'} flex items-center justify-between shrink-0 text-xs`}>
            <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>1ª Delegacia Metropolitana de Maracanaú • Sistema Oficial</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark 
                  ? 'bg-[#201838] hover:bg-purple-950 text-zinc-300 hover:text-white border-purple-800/40' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm font-bold'
              }`}
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

      {/* Modal de Confirmação para Limpeza de Histórico Desta Oitiva */}
      <ConfirmModal
        isOpen={showClearHistoryConfirm}
        onClose={() => setShowClearHistoryConfirm(false)}
        onConfirm={handleConfirmClearHistory}
        title="Limpar Histórico Desta Oitiva?"
        message={`Confirma a exclusão de todo o histórico de remarcações e alterações desta oitiva de "${oitiva.personName}" (Procedimento: ${oitiva.procedureNumber || 'S/N'})? Os dados cadastrais desta oitiva e quaisquer outros agendamentos cadastrados permanecerão totalmente intactos e preservados.`}
        confirmText="Sim, Limpar Histórico Desta Oitiva"
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
