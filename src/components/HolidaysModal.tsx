import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Shield, 
  Check, 
  RefreshCw, 
  Sun, 
  Flame, 
  Info, 
  RotateCcw,
  Save,
  AlertTriangle
} from 'lucide-react';
import { CalendarSpecialDate, SpecialDateType, UserProfile } from '../types/oitiva';
import { specialDateService, isUserAdmin, DEFAULT_FERIADOS_MARACANAU } from '../services/specialDateService';
import { formatDateBR } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { ConfirmModal } from './ConfirmModal';

interface HolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  specialDates: CalendarSpecialDate[];
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  defaultSelectedDate?: string;
}

export const HolidaysModal: React.FC<HolidaysModalProps> = ({
  isOpen,
  onClose,
  user,
  specialDates,
  onShowToast,
  defaultSelectedDate
}) => {
  const { isDark } = useTheme();
  const isAdmin = isUserAdmin(user);

  // Modal de Edição / Cadastro In-App (Garante que nenhuma janela seja bloqueada por iframe)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(defaultSelectedDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<SpecialDateType>('feriado');
  const [description, setDescription] = useState<string>('');
  const [isRecurringAnnual, setIsRecurringAnnual] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais de Confirmação In-App (Substituem completamente window.confirm)
  const [deletingHoliday, setDeletingHoliday] = useState<CalendarSpecialDate | null>(null);
  const [isConfirmSeedOpen, setIsConfirmSeedOpen] = useState<boolean>(false);

  // Weekend settings
  const sundayConfig = specialDates.find(x => x.id === 'weekend_sunday' || x.dayOfWeek === 0);
  const saturdayConfig = specialDates.find(x => x.id === 'weekend_saturday' || x.dayOfWeek === 6);
  const isSundayEnabled = sundayConfig ? sundayConfig.enabled !== false : true;
  const isSaturdayEnabled = saturdayConfig ? saturdayConfig.enabled !== false : true;

  if (!isOpen) return null;

  // Abrir janela para cadastrar novo feriado
  const handleOpenCreate = () => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem cadastrar feriados.', 'error');
      return;
    }
    setEditingId(null);
    setTitle('');
    setDate(defaultSelectedDate || new Date().toISOString().split('T')[0]);
    setType('feriado');
    setDescription('');
    setIsRecurringAnnual(true);
    setIsEditModalOpen(true);
  };

  // Abrir janela para editar feriado existente
  const handleOpenEdit = (item: CalendarSpecialDate) => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem editar feriados.', 'error');
      return;
    }
    setEditingId(item.id);
    setTitle(item.title);
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setType(item.type || 'feriado');
    setDescription(item.description || '');
    setIsRecurringAnnual(item.isRecurringAnnual !== false);
    setIsEditModalOpen(true);
  };

  // Salvar cadastro ou alteração
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      onShowToast('Apenas administradores podem adicionar ou editar feriados.', 'error');
      return;
    }

    if (!title.trim()) {
      onShowToast('Informe o título do feriado ou demarcação.', 'error');
      return;
    }

    if (!date) {
      onShowToast('Selecione a data.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await specialDateService.save({
        id: editingId || undefined,
        title: title.trim(),
        date,
        type,
        description: description.trim(),
        isRecurringAnnual,
        enabled: true,
        color: 'red'
      }, user);

      onShowToast(
        editingId ? `Feriado "${title}" atualizado com sucesso!` : `Feriado "${title}" cadastrado!`,
        'success'
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar feriado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solicitar exclusão via ConfirmModal in-app
  const handleRequestDelete = (item: CalendarSpecialDate) => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem excluir feriados.', 'error');
      return;
    }
    setDeletingHoliday(item);
  };

  // Confirmar exclusão do feriado
  const handleConfirmDelete = async () => {
    if (!deletingHoliday) return;
    if (!isAdmin) {
      onShowToast('Apenas administradores podem excluir feriados.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await specialDateService.delete(deletingHoliday.id, user);
      onShowToast(`Feriado "${deletingHoliday.title}" removido com sucesso!`, 'info');
      if (editingId === deletingHoliday.id) {
        setIsEditModalOpen(false);
      }
      setDeletingHoliday(null);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao remover feriado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Solicitar sincronização dos feriados oficiais de Maracanaú/CE
  const handleRequestSeed = () => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem executar esta ação.', 'error');
      return;
    }
    setIsConfirmSeedOpen(true);
  };

  // Confirmar sincronização oficial
  const handleConfirmSeed = async () => {
    if (!isAdmin) return;

    setIsSubmitting(true);
    try {
      for (const item of DEFAULT_FERIADOS_MARACANAU) {
        await specialDateService.save({
          ...item,
          id: `holiday_${item.date?.replace(/-/g, '_')}`
        }, user);
      }
      onShowToast('Todos os feriados oficiais de Maracanaú/CE foram sincronizados com sucesso!', 'success');
      setIsConfirmSeedOpen(false);
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao carregar feriados padrão.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Alternar destaque visual de sábado/domingo
  const handleToggleWeekend = async (dayOfWeek: number, currentStatus: boolean) => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem configurar exibição de fins de semana.', 'error');
      return;
    }

    try {
      await specialDateService.toggleWeekendDisplay(dayOfWeek, !currentStatus, user);
      onShowToast(
        `Card de ${dayOfWeek === 0 ? 'Domingo' : 'Sábado'} ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao alterar configuração.', 'error');
    }
  };

  // Filtragem dos feriados cadastrados (ignora fins de semana recorrentes na lista de datas)
  const holidayItems = specialDates
    .filter(x => !x.isRecurringWeekend && x.id !== 'weekend_sunday' && x.id !== 'weekend_saturday')
    .filter(x => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        x.title.toLowerCase().includes(q) ||
        (x.date && x.date.includes(q)) ||
        (x.description && x.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm no-print overflow-y-auto"
      >
        <div className={`border-2 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col my-auto transition-colors ${
          isDark 
            ? 'bg-[#120f1e] border-purple-500/70 text-white shadow-purple-950/90' 
            : 'bg-white border-slate-300 text-slate-900 shadow-2xl'
        }`}>
          
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b-2 flex items-center justify-between shrink-0 transition-colors ${
            isDark ? 'border-purple-800/60 bg-[#161129]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md ${
                isDark 
                  ? 'bg-gradient-to-br from-red-600 to-rose-950 border-red-400/80 text-red-200' 
                  : 'bg-rose-100 border-rose-300 text-rose-950'
              }`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Demarcação de Fins de Semana e Feriados
                  </h2>
                  {isAdmin ? (
                    <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full flex items-center gap-1 border ${
                      isDark ? 'bg-red-950/80 text-red-300 border-red-500/60' : 'bg-rose-100 text-rose-950 border-rose-300 font-bold'
                    }`}>
                      <Shield className="w-3 h-3 text-red-500" />
                      Painel Administrador
                    </span>
                  ) : (
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      isDark ? 'bg-purple-950 text-purple-300 border-purple-700/60' : 'bg-purple-100 text-purple-950 border-purple-300'
                    }`}>
                      Visualização Geral
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                  Os feriados são destacados em vermelho no calendário para toda a equipe. Clique em qualquer feriado para editá-lo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'text-zinc-300 hover:text-white hover:bg-purple-950/80 border-purple-800/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">

            {/* Informativo de Fins de Semana */}
            <div className={`border-2 rounded-2xl p-4 space-y-3 transition-colors ${
              isDark ? 'bg-[#18112e] border-red-900/60' : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b ${
                isDark ? 'border-purple-800/40' : 'border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-rose-950'}`}>
                    Destaque Visual de Fins de Semana (Tonalidade Vermelha)
                  </h3>
                </div>
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  Sábados e domingos sinalizados sem poluição visual de cards
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Info Domingo */}
                <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                  isDark ? 'bg-[#220a10] border-red-800/70' : 'bg-rose-100/70 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs font-mono ${
                      isDark ? 'bg-red-950 border-red-500/80 text-red-400' : 'bg-rose-200 border-rose-400 text-rose-950'
                    }`}>
                      DOM
                    </div>
                    <div>
                      <p className={`text-xs font-black ${isDark ? 'text-red-300' : 'text-rose-950'}`}>Domingos</p>
                      <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Fundo e cabeçalho em tom vermelho suave</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                    isDark ? 'text-red-300 bg-red-950/90 border-red-500/50' : 'text-rose-950 bg-rose-200 border-rose-400 font-bold'
                  }`}>
                    Dia Não Útil
                  </span>
                </div>

                {/* Info Sábado */}
                <div className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                  isDark ? 'bg-[#220a10] border-red-800/70' : 'bg-rose-100/70 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-black text-xs font-mono ${
                      isDark ? 'bg-red-950 border-red-500/80 text-red-400' : 'bg-rose-200 border-rose-400 text-rose-950'
                    }`}>
                      SÁB
                    </div>
                    <div>
                      <p className={`text-xs font-black ${isDark ? 'text-red-300' : 'text-rose-950'}`}>Sábados</p>
                      <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Fundo e cabeçalho em tom vermelho suave</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                    isDark ? 'text-red-300 bg-red-950/90 border-red-500/50' : 'text-rose-950 bg-rose-200 border-rose-400 font-bold'
                  }`}>
                    Dia Não Útil
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Ações Rápidas & Busca de Feriados */}
            <div className={`p-4 rounded-2xl border-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm transition-colors ${
              isDark ? 'bg-[#18112e] border-purple-800/50' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Calendar className={`w-5 h-5 shrink-0 ${isDark ? 'text-red-400' : 'text-rose-600'}`} />
                <div className="min-w-0">
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Feriados & Datas Especiais ({holidayItems.length})
                  </h3>
                  <p className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    Clique em qualquer item para editar ou excluir diretamente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar feriado ou data..."
                  className={`border-2 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-colors w-full sm:w-56 ${
                    isDark
                      ? 'bg-[#0f0a1d] border-purple-700/60 text-white placeholder-zinc-500 focus:border-red-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-rose-500 shadow-sm'
                  }`}
                />

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className={`flex items-center gap-1.5 px-3.5 py-2 border-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-95 ${
                        isDark
                          ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border-red-400/80 shadow-red-950/80'
                          : 'bg-rose-200 hover:bg-rose-300 text-rose-950 border-rose-400 shadow-sm'
                      }`}
                      title="Abrir janela de cadastro de novo feriado"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo Feriado</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRequestSeed}
                      disabled={isSubmitting}
                      className={`flex items-center gap-1.5 px-3 py-2 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isDark
                          ? 'bg-[#22163b] hover:bg-[#2e1d52] text-purple-200 border-purple-500/60'
                          : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 shadow-sm'
                      }`}
                      title="Sincronizar feriados nacionais, estaduais do Ceará e municipais de Maracanaú"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                      <span>Sincronizar Padrões</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Grid de Cards de Feriados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {holidayItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEdit(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(item);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 shadow-md group cursor-pointer ${
                    isDark 
                      ? 'bg-[#1a122e] border-red-500/70 hover:border-red-400 hover:bg-[#22163c]' 
                      : 'bg-rose-50/70 border-rose-300 hover:border-rose-400 hover:bg-rose-100/60'
                  }`}
                  title="Clique para editar este feriado"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`px-2.5 py-1.5 rounded-xl border font-mono font-black text-xs text-center shrink-0 ${
                      isDark ? 'bg-[#2b080f] border-red-500 text-red-300' : 'bg-rose-200 border-rose-400 text-rose-950'
                    }`}>
                      {item.date ? formatDateBR(item.date).slice(0, 5) : '--/--'}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs font-black truncate group-hover:underline ${isDark ? 'text-white' : 'text-slate-900'}`} title={item.title}>
                          {item.title}
                        </p>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          isDark ? 'bg-red-950 text-red-300 border-red-500/60' : 'bg-rose-200 text-rose-950 border-rose-300'
                        }`}>
                          {item.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado'}
                        </span>
                        {item.isRecurringAnnual !== false ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink-0 ${
                            isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                          }`}>
                            <RotateCcw className="w-2.5 h-2.5" /> Todo ano
                          </span>
                        ) : (
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${
                            isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}>
                            Data pontual
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className={`text-[11px] truncate ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} title={item.description}>
                          {item.description}
                        </p>
                      )}
                      <p className={`text-[10px] font-medium ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                        Data oficial: {item.date ? formatDateBR(item.date) : 'Data recorrente'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-purple-900/70 hover:bg-purple-800 text-purple-200 border-purple-500/60' 
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300 shadow-sm'
                        }`}
                        title="Editar feriado"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestDelete(item);
                        }}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-600/60' 
                            : 'bg-rose-200 hover:bg-rose-300 text-rose-950 border-rose-400 shadow-sm'
                        }`}
                        title="Remover feriado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {holidayItems.length === 0 && (
                <div className={`col-span-full py-12 text-center border-2 border-dashed rounded-3xl space-y-3 ${
                  isDark ? 'bg-[#151026] border-purple-800/60' : 'bg-slate-50 border-slate-300'
                }`}>
                  <Calendar className={`w-10 h-10 mx-auto ${isDark ? 'text-purple-400/60' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      Nenhum feriado localizado no filtro.
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Cadastre uma nova data ou sincronize os padrões oficiais do Ceará e Maracanaú.
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleOpenCreate}
                        className={`px-4 py-2 border-2 rounded-xl text-xs font-black cursor-pointer inline-flex items-center gap-1.5 shadow-md ${
                          isDark ? 'bg-red-600 text-white border-red-400' : 'bg-rose-200 text-rose-950 border-rose-400'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Cadastrar Novo Feriado</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestSeed}
                        className={`px-4 py-2 border-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-md ${
                          isDark ? 'bg-[#22163b] text-purple-200 border-purple-500/60' : 'bg-purple-100 text-purple-950 border-purple-300'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Carregar Feriados Oficiais</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className={`p-4 border-t-2 flex items-center justify-between shrink-0 text-xs ${
            isDark ? 'border-purple-800/60 bg-[#161129]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className={`flex items-center gap-2 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>
              <span>Sincronização Firebase Realtime & Firestore Ativa</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                isDark 
                  ? 'bg-[#22163b] hover:bg-purple-900 text-white border-purple-600/60' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
              }`}
            >
              Fechar
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL IN-APP: EDITAR / CADASTRAR FERIADO (Sem risco de bloqueio por iframe) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto no-print"
        >
          <div 
            role="dialog"
            aria-modal="true"
            className={`border-2 rounded-3xl w-[95vw] max-w-lg overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-left my-auto transition-colors ${
              isDark
                ? 'bg-[#151025] border-red-500/70 shadow-red-950/80 text-white'
                : 'bg-white border-rose-300 shadow-2xl text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b-2 ${
              isDark ? 'border-purple-900/50' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md ${
                  isDark ? 'bg-red-950/80 border-red-500/70 text-red-300' : 'bg-rose-100 border-rose-300 text-rose-950'
                }`}>
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {editingId ? 'Editar Feriado / Demarcação' : 'Cadastrar Novo Feriado'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    {editingId ? 'Altere as informações da data selecionada' : 'Defina um feriado nacional, estadual ou local'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isDark 
                    ? 'text-zinc-300 hover:text-white hover:bg-purple-950/60 border-purple-900/40' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Título */}
              <div className="space-y-1">
                <label className={`text-xs font-bold block ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  Nome do Feriado / Demarcação *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Feriado da Independência, Aniversário de Maracanaú"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none transition-colors border-2 ${
                    isDark 
                      ? 'bg-[#0f0a1d] border-purple-600/70 text-white focus:border-red-400' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Data e Classificação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-bold block ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none transition-colors border-2 ${
                      isDark 
                        ? 'bg-[#0f0a1d] border-purple-600/70 text-white focus:border-red-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-bold block ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    Classificação
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SpecialDateType)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none transition-colors border-2 ${
                      isDark 
                        ? 'bg-[#0f0a1d] border-purple-600/70 text-white focus:border-red-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  >
                    <option value="feriado">Feriado Oficial</option>
                    <option value="ponto_facultativo">Ponto Facultativo</option>
                    <option value="fim_de_semana">Fim de Semana Especial</option>
                    <option value="outro">Outro Marco</option>
                  </select>
                </div>
              </div>

              {/* Descrição / Base Legal */}
              <div className="space-y-1">
                <label className={`text-xs font-bold block ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                  Descrição ou Base Legal (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Lei Municipal nº 123/2010, Feriado Estadual, etc."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition-colors border-2 ${
                    isDark 
                      ? 'bg-[#0f0a1d] border-purple-600/70 text-zinc-200 focus:border-red-400' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Repetição Anual Recorrente */}
              <div className={`border-2 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm ${
                isDark ? 'bg-[#18112e] border-purple-600/50' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isRecurringAnnual 
                      ? isDark ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-200 border-slate-300 text-slate-600'
                  }`}>
                    <RotateCcw className={`w-4 h-4 ${isRecurringAnnual ? isDark ? 'text-emerald-400' : 'text-emerald-700' : ''}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Repetir Todo Ano
                    </p>
                    <p className={`text-[10px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      {isRecurringAnnual ? 'Se repetirá automaticamente nos próximos anos' : 'Válido apenas para o ano da data'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRecurringAnnual(!isRecurringAnnual)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all cursor-pointer shrink-0 ${
                    isRecurringAnnual
                      ? isDark 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 shadow-md'
                        : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-400 font-bold'
                      : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-600'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  }`}
                >
                  {isRecurringAnnual ? '✓ Recorrente' : 'Pontual'}
                </button>
              </div>

              {/* Botões do Modal */}
              <div className={`flex items-center justify-between pt-3 border-t-2 ${
                isDark ? 'border-purple-900/40' : 'border-slate-200'
              }`}>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const item = holidayItems.find(x => x.id === editingId) || { id: editingId, title: title || 'Feriado' } as CalendarSpecialDate;
                      handleRequestDelete(item);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-600/70'
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-300 font-bold'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[#201838] hover:bg-purple-950 text-zinc-300 border-purple-700/50'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black shadow-lg border-2 transition-all cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/80 border-red-400'
                        : 'bg-rose-200 hover:bg-rose-300 text-rose-950 border-rose-400 shadow-sm'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmitting ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Cadastrar Feriado')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO DE EXCLUSÃO (In-App ConfirmModal - 100% Funcional em iframe)  */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deletingHoliday)}
        onClose={() => setDeletingHoliday(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Feriado / Demarcação"
        message={`Deseja realmente remover o feriado "${deletingHoliday?.title}"? Esta data deixará de ser sinalizada em vermelho no calendário para todos os policiais e servidores.`}
        confirmText="Excluir Feriado"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isSubmitting}
      />

      {/* ========================================================================= */}
      {/* CONFIRMAÇÃO DE SINCRONIZAÇÃO OFICIAL DE MARACANAÚ/CE                      */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={isConfirmSeedOpen}
        onClose={() => setIsConfirmSeedOpen(false)}
        onConfirm={handleConfirmSeed}
        title="Sincronizar Feriados Oficiais"
        message="Deseja sincronizar e carregar todos os Feriados Nacionais, Estaduais (Ceará) e Municipais (Maracanaú)? Todas as datas oficiais serão salvas na nuvem e compartilhadas com toda a equipe policial."
        confirmText="Sincronizar Agora"
        cancelText="Cancelar"
        isDestructive={false}
        isLoading={isSubmitting}
      />
    </>
  );
};
