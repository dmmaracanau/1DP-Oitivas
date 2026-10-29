import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Shield, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Sun,
  Flame,
  Info,
  RotateCcw
} from 'lucide-react';
import { CalendarSpecialDate, SpecialDateType, UserProfile } from '../types/oitiva';
import { specialDateService, isUserAdmin, DEFAULT_FERIADOS_MARACANAU } from '../services/specialDateService';
import { formatDateBR } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';

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

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(defaultSelectedDate || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<SpecialDateType>('feriado');
  const [description, setDescription] = useState<string>('');
  const [isRecurringAnnual, setIsRecurringAnnual] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Weekend settings
  const sundayConfig = specialDates.find(x => x.id === 'weekend_sunday' || x.dayOfWeek === 0);
  const saturdayConfig = specialDates.find(x => x.id === 'weekend_saturday' || x.dayOfWeek === 6);
  const isSundayEnabled = sundayConfig ? sundayConfig.enabled !== false : true;
  const isSaturdayEnabled = saturdayConfig ? saturdayConfig.enabled !== false : true;

  if (!isOpen) return null;

  const handleStartEdit = (item: CalendarSpecialDate) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setType(item.type || 'feriado');
    setDescription(item.description || '');
    setIsRecurringAnnual(item.isRecurringAnnual !== false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDate(defaultSelectedDate || new Date().toISOString().split('T')[0]);
    setType('feriado');
    setDescription('');
    setIsRecurringAnnual(true);
  };

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
      handleCancelEdit();
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao salvar feriado.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem excluir feriados.', 'error');
      return;
    }

    if (window.confirm(`Deseja realmente remover o feriado "${itemTitle}"?`)) {
      try {
        await specialDateService.delete(id, user);
        onShowToast(`Feriado "${itemTitle}" removido com sucesso!`, 'info');
        if (editingId === id) {
          handleCancelEdit();
        }
      } catch (err: any) {
        onShowToast(err.message || 'Erro ao remover feriado.', 'error');
      }
    }
  };

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

  const handleSeedDefaults = async () => {
    if (!isAdmin) {
      onShowToast('Apenas administradores podem executar esta ação.', 'error');
      return;
    }

    if (window.confirm('Deseja sincronizar e carregar todos os Feriados Nacionais, Estaduais (Ceará) e Municipais (Maracanaú)?')) {
      try {
        setIsSubmitting(true);
        for (const item of DEFAULT_FERIADOS_MARACANAU) {
          await specialDateService.save({
            ...item,
            id: `holiday_${item.date?.replace(/-/g, '_')}`
          }, user);
        }
        onShowToast('Todos os feriados oficiais de Maracanaú/CE foram sincronizados com sucesso!', 'success');
      } catch (err: any) {
        onShowToast(err.message || 'Erro ao carregar feriados padrão.', 'error');
      } finally {
        setIsSubmitting(false);
      }
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm no-print overflow-y-auto"
      // Note: Backdrop click close removed per user specification
    >
      <div className={`border-2 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col my-auto ${
        isDark 
          ? 'bg-[#120f1e] border-purple-500/70 text-white shadow-purple-950/90' 
          : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
      }`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b-2 flex items-center justify-between shrink-0 ${
          isDark ? 'border-purple-800/60 bg-[#161129]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-950 border-2 border-red-400/80 flex items-center justify-center text-red-200 shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Demarcação de Fins de Semana e Feriados
                </h2>
                {isAdmin ? (
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full flex items-center gap-1 border ${
                    isDark ? 'bg-red-950/80 text-red-300 border-red-500/60' : 'bg-rose-100 text-rose-950 border-rose-300'
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
                Os cards são destacados em vermelho no calendário para todos os usuários em tempo real.
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Informativo de Fins de Semana (Tonalidade Vermelha Escura) */}
          <div className={`border-2 rounded-2xl p-4 space-y-3 ${
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
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#220a10] border-2 border-red-800/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-500/80 flex items-center justify-center font-black text-red-400 text-xs font-mono">
                    DOM
                  </div>
                  <div>
                    <p className="text-xs font-black text-red-300">Domingos</p>
                    <p className="text-[10px] text-zinc-400">Fundo e cabeçalho em vermelho escuro</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-red-300 bg-red-950/90 px-2.5 py-1 rounded-md border border-red-500/50">
                  Dia Não Útil
                </span>
              </div>

              {/* Info Sábado */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#220a10] border-2 border-red-800/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-500/80 flex items-center justify-center font-black text-red-400 text-xs font-mono">
                    SÁB
                  </div>
                  <div>
                    <p className="text-xs font-black text-red-300">Sábados</p>
                    <p className="text-[10px] text-zinc-400">Fundo e cabeçalho em vermelho escuro</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-red-300 bg-red-950/90 px-2.5 py-1 rounded-md border border-red-500/50">
                  Dia Não Útil
                </span>
              </div>
            </div>
          </div>

          {/* Formulário de Cadastro / Edição (Exclusivo Administrador) */}
          {isAdmin ? (
            <div className="bg-[#18112e] border-2 border-red-500/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-purple-800/40">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {editingId ? 'Editar Feriado / Demarcação' : 'Cadastrar Novo Feriado'}
                  </h3>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-purple-300 hover:text-white underline cursor-pointer"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Título do Feriado */}
                <div className="sm:col-span-6 space-y-1">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Nome do Feriado / Demarcação *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Feriado da Independência, Aniversário de Maracanaú"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 ${
                      isDark 
                        ? 'bg-[#0f0a1d] border-purple-600/70 text-white focus:border-red-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* Data */}
                <div className="sm:col-span-3 space-y-1">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 ${
                      isDark 
                        ? 'bg-[#0f0a1d] border-purple-600/70 text-white focus:border-red-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* Tipo */}
                <div className="sm:col-span-3 space-y-1">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Classificação
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SpecialDateType)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none transition-colors border-2 ${
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

                {/* Descrição / Observação */}
                <div className="sm:col-span-12 space-y-1">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Descrição ou Base Legal (Opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Feriado Nacional, Lei Municipal nº 123, etc."
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none transition-colors border-2 ${
                      isDark 
                        ? 'bg-[#0f0a1d] border-purple-600/70 text-zinc-200 focus:border-red-400' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-rose-500'
                    }`}
                  />
                </div>

                {/* Opção de Feriado Recorrente (Repetir todo ano) */}
                <div className={`sm:col-span-8 border-2 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-sm ${
                  isDark ? 'bg-[#120a24] border-purple-600/50' : 'bg-slate-50 border-slate-300'
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
                        Repetir Todo Ano (Feriado Recorrente)
                      </p>
                      <p className={`text-[10px] truncate ${isDark ? 'text-purple-300' : 'text-slate-600'}`}>
                        {isRecurringAnnual 
                          ? 'Se repetirá automaticamente nesta mesma data nos anos futuros' 
                          : 'Válido apenas para o ano selecionado'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecurringAnnual(!isRecurringAnnual)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black border-2 transition-all cursor-pointer shrink-0 ${
                      isRecurringAnnual
                        ? isDark 
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-400 shadow-sm'
                        : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-600'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                    }`}
                  >
                    {isRecurringAnnual ? '✓ Repetir Todo Ano' : 'Apenas Este Ano'}
                  </button>
                </div>

                {/* Botão de Ação */}
                <div className="sm:col-span-4 flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-lg border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isDark
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-red-950/80 border-red-400'
                        : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-400 shadow-sm'
                    }`}
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Atualizar' : 'Salvar Feriado'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className={`p-3.5 border-2 rounded-2xl text-xs flex items-center gap-2.5 ${
              isDark ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-950'
            }`}>
              <Info className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
              <span>
                Feriados e fins de semana são aplicados para todos os usuários do sistema. Apenas administradores têm permissão para cadastrar, editar ou excluir.
              </span>
            </div>
          )}

          {/* Lista de Feriados Cadastrados */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Feriados Cadastrados ({holidayItems.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar feriado ou data..."
                  className={`border-2 rounded-xl px-3 py-1.5 text-xs focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#0f0a1d] border-purple-700/60 text-white placeholder-zinc-500 focus:border-purple-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500 shadow-sm'
                  }`}
                />

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSeedDefaults}
                    disabled={isSubmitting}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[#22163b] hover:bg-[#2e1d52] text-purple-200 border-purple-500/60'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-300 shadow-sm'
                    }`}
                    title="Recarrega todos os feriados nacionais, estaduais do Ceará e municipais de Maracanaú"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    <span>Sincronizar Padrões Oficiais</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabela / Cards de Feriados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {holidayItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 shadow-md ${
                    isDark 
                      ? 'bg-[#1a122e] border-red-500/70 hover:border-red-400' 
                      : 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`px-2.5 py-1.5 rounded-xl border font-mono font-black text-xs text-center shrink-0 ${
                      isDark ? 'bg-[#2b080f] border-red-500 text-red-300' : 'bg-rose-100 border-rose-400 text-rose-950'
                    }`}>
                      {item.date ? formatDateBR(item.date).slice(0, 5) : '--/--'}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`} title={item.title}>
                          {item.title}
                        </p>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                          isDark ? 'bg-red-950 text-red-300 border-red-500/60' : 'bg-rose-100 text-rose-950 border-rose-300'
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
                        Data base: {item.date ? formatDateBR(item.date) : 'Data recorrente'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDark 
                            ? 'bg-purple-900/60 hover:bg-purple-800 text-purple-200 border-purple-500/50' 
                            : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-purple-300'
                        }`}
                        title="Editar feriado"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isDark 
                            ? 'bg-red-950/80 hover:bg-red-900 text-red-300 border-red-600/50' 
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-950 border-rose-300'
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
                <div className={`col-span-2 py-8 text-center border-2 border-dashed rounded-2xl space-y-2 ${
                  isDark ? 'bg-[#151026] border-purple-800/60' : 'bg-slate-50 border-slate-300'
                }`}>
                  <Calendar className={`w-8 h-8 mx-auto ${isDark ? 'text-purple-400/60' : 'text-slate-400'}`} />
                  <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Nenhum feriado localizado no filtro.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleSeedDefaults}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold border border-red-400 shadow-md cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Carregar Feriados Padrão de Maracanaú</span>
                    </button>
                  )}
                </div>
              )}
            </div>
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
  );
};
