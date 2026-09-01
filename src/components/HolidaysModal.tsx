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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md no-print overflow-y-auto"
      // Note: Backdrop click close removed per user specification
    >
      <div className="bg-[#120f1e] border-2 border-purple-500/70 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-purple-950/90 flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-purple-800/60 bg-[#161129] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-950 border-2 border-red-400/80 flex items-center justify-center text-red-200 shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Demarcação de Fins de Semana e Feriados
                </h2>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-black bg-red-950/80 text-red-300 border border-red-500/60 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3 text-red-400" />
                    Painel Administrador
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700/60 rounded-full">
                    Visualização Geral
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                Os cards são destacados em vermelho no calendário para todos os usuários em tempo real.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/80 border border-purple-800/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Informativo de Fins de Semana (Tonalidade Vermelha Escura) */}
          <div className="bg-[#18112e] border-2 border-red-900/60 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-800/40">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Destaque Visual de Fins de Semana (Tonalidade Vermelha)
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400">
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
                  <label className="text-[11px] font-bold text-zinc-300 block">
                    Nome do Feriado / Demarcação *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Feriado da Independência, Aniversário de Maracanaú"
                    className="w-full bg-[#0f0a1d] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-400 transition-colors"
                  />
                </div>

                {/* Data */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 block">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0f0a1d] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-400 transition-colors"
                  />
                </div>

                {/* Tipo */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 block">
                    Classificação
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SpecialDateType)}
                    className="w-full bg-[#0f0a1d] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-400 transition-colors"
                  >
                    <option value="feriado">Feriado Oficial</option>
                    <option value="ponto_facultativo">Ponto Facultativo</option>
                    <option value="fim_de_semana">Fim de Semana Especial</option>
                    <option value="outro">Outro Marco</option>
                  </select>
                </div>

                {/* Descrição / Observação */}
                <div className="sm:col-span-12 space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 block">
                    Descrição ou Base Legal (Opcional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Feriado Nacional, Lei Municipal nº 123, etc."
                    className="w-full bg-[#0f0a1d] border-2 border-purple-600/70 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-red-400 transition-colors"
                  />
                </div>

                {/* Opção de Feriado Recorrente (Repetir todo ano) */}
                <div className="sm:col-span-8 bg-[#120a24] border-2 border-purple-600/50 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isRecurringAnnual ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    }`}>
                      <RotateCcw className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white">
                        Repetir Todo Ano (Feriado Recorrente)
                      </p>
                      <p className="text-[10px] text-purple-300 truncate">
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
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-300 shadow-md shadow-emerald-950'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-600'
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
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-950/80 border-2 border-red-400 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingId ? 'Atualizar' : 'Salvar Feriado'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-3.5 bg-purple-950/40 border-2 border-purple-800/60 rounded-2xl text-xs text-purple-300 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Feriados e fins de semana são aplicados para todos os usuários do sistema. Apenas administradores têm permissão para cadastrar, editar ou excluir.
              </span>
            </div>
          )}

          {/* Lista de Feriados Cadastrados */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Feriados Cadastrados ({holidayItems.length})
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar feriado ou data..."
                  className="bg-[#0f0a1d] border-2 border-purple-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                />

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSeedDefaults}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22163b] hover:bg-[#2e1d52] text-purple-200 border-2 border-purple-500/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Recarrega todos os feriados nacionais, estaduais do Ceará e municipais de Maracanaú"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
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
                  className="p-3 rounded-2xl bg-[#1a122e] border-2 border-red-500/70 hover:border-red-400 transition-all flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="px-2.5 py-1.5 rounded-xl bg-[#2b080f] border border-red-500 text-red-300 font-mono font-black text-xs text-center shrink-0">
                      {item.date ? formatDateBR(item.date).slice(0, 5) : '--/--'}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-black text-white truncate" title={item.title}>
                          {item.title}
                        </p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/60 shrink-0">
                          {item.type === 'ponto_facultativo' ? 'Ponto Facultativo' : 'Feriado'}
                        </span>
                        {item.isRecurringAnnual !== false ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shrink-0">
                            <RotateCcw className="w-2.5 h-2.5" /> Todo ano
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                            Data pontual
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-zinc-300 truncate" title={item.description}>
                          {item.description}
                        </p>
                      )}
                      <p className="text-[10px] text-purple-300 font-medium">
                        Data base: {item.date ? formatDateBR(item.date) : 'Data recorrente'}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/50 transition-colors cursor-pointer"
                        title="Editar feriado"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-600/50 transition-colors cursor-pointer"
                        title="Remover feriado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {holidayItems.length === 0 && (
                <div className="col-span-2 py-8 text-center bg-[#151026] border-2 border-dashed border-purple-800/60 rounded-2xl space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-purple-400/60" />
                  <p className="text-xs text-zinc-300 font-bold">Nenhum feriado localizado no filtro.</p>
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
        <div className="p-4 border-t-2 border-purple-800/60 bg-[#161129] flex items-center justify-between shrink-0 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse"></span>
            <span>Sincronização Firebase Realtime & Firestore Ativa</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#22163b] hover:bg-purple-900 text-white rounded-xl text-xs font-bold border-2 border-purple-600/60 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
