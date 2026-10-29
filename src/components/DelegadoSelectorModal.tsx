import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Shield, 
  Search, 
  Sparkles, 
  Info,
  Users,
  UserCheck,
  FileBadge
} from 'lucide-react';
import { DelegadoInfo, delegadoService, AuthorityCategory } from '../services/delegadoService';
import { UserProfile } from '../types/oitiva';
import { ConfirmModal } from './ConfirmModal';
import { useTheme } from '../context/ThemeContext';

interface DelegadoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDelegado?: (delegado: DelegadoInfo) => void;
  currentSelectedNome?: string;
  user?: UserProfile | null;
  isAdmin?: boolean;
}

export const DelegadoSelectorModal: React.FC<DelegadoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectDelegado,
  currentSelectedNome,
  user
}) => {
  const { isDark } = useTheme();
  const [delegados, setDelegados] = useState<DelegadoInfo[]>([]);
  const [activeCategory, setActiveCategory] = useState<AuthorityCategory>('dpc');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Exclusão via modal in-app (sem window.confirm)
  const [delegadoToDelete, setDelegadoToDelete] = useState<DelegadoInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
  const [formCategory, setFormCategory] = useState<AuthorityCategory>('dpc');
  const [formNome, setFormNome] = useState('');
  const [formCargo, setFormCargo] = useState('Delegado de Polícia Civil');
  const [formMatricula, setFormMatricula] = useState('');
  const [formDelegacia, setFormDelegacia] = useState('1ª Delegacia Metropolitana de Maracanaú');
  const [formMunicipio, setFormMunicipio] = useState('Maracanaú/CE');
  const [formObs, setFormObs] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');

  // Subscribe to real-time unified delegados list
  useEffect(() => {
    if (!isOpen) return;

    setIsAddingNew(false);
    setEditingId(null);
    setSearchTerm('');
    setFeedback(null);
    setDelegadoToDelete(null);

    const unsubscribe = delegadoService.subscribeToDelegados((list) => {
      setDelegados(list);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setFormCategory(activeCategory);
    setFormNome('');
    setFormCargo(activeCategory === 'dpc' ? 'Delegado de Polícia Civil' : 'Oficial de Investigação Policial (OIP)');
    setFormMatricula('');
    setFormDelegacia(user?.unitName || '1ª Delegacia Metropolitana de Maracanaú');
    setFormMunicipio('Maracanaú/CE');
    setFormObs('');
    setFormFotoUrl('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (d: DelegadoInfo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(d.id);
    setFormCategory(d.category || activeCategory);
    setFormNome(d.nome);
    setFormCargo(d.cargo || (d.category === 'oip' ? 'Oficial de Investigação Policial' : 'Delegado de Polícia Civil'));
    setFormMatricula(d.matricula || '');
    setFormDelegacia(d.delegacia || '1ª Delegacia Metropolitana de Maracanaú');
    setFormMunicipio(d.municipio || 'Maracanaú/CE');
    setFormObs(d.portariaOuObs || '');
    setFormFotoUrl(d.fotoUrl || '');
    setIsAddingNew(true);
  };

  const handleSaveDelegado = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNome.trim()) {
      showMsg(`O nome do profissional (${formCategory.toUpperCase()}) é obrigatório.`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const newObj: DelegadoInfo = {
        id: editingId || `${formCategory}_${Date.now()}`,
        category: formCategory,
        nome: formNome.trim(),
        cargo: formCargo.trim() || (formCategory === 'oip' ? 'Oficial de Investigação Policial' : 'Delegado de Polícia Civil'),
        matricula: formMatricula.trim(),
        delegacia: formDelegacia.trim() || '1ª Delegacia Metropolitana de Maracanaú',
        municipio: formMunicipio.trim() || 'Maracanaú/CE',
        portariaOuObs: formObs.trim() || '',
        fotoUrl: formFotoUrl.trim() || ''
      };

      await delegadoService.addOrUpdateDelegado(newObj);
      showMsg(`Registro "${newObj.nome}" (${formCategory.toUpperCase()}) salvo e sincronizado para toda a equipe!`, 'success');
      setIsAddingNew(false);
      setEditingId(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao salvar registro.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (delegado: DelegadoInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    setDelegadoToDelete(delegado);
  };

  const handleConfirmDelete = async () => {
    if (!delegadoToDelete) return;
    setIsDeleting(true);
    try {
      const nomeRemovido = delegadoToDelete.nome;
      await delegadoService.removeDelegado(delegadoToDelete.id);
      showMsg(`"${nomeRemovido}" foi removido do catálogo e sincronizado para todos.`, 'success');
      setDelegadoToDelete(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao remover registro.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelect = (delegado: DelegadoInfo) => {
    delegadoService.setLastSelectedDelegado(delegado.nome);
    if (onSelectDelegado) {
      onSelectDelegado(delegado);
    }
    onClose();
  };

  const categoryItems = delegados.filter(d => {
    const itemCat = d.category || (d.id.startsWith('oip_') ? 'oip' : 'dpc');
    return itemCat === activeCategory;
  });

  const filteredDelegados = categoryItems.filter(d => 
    (d.nome && d.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.matricula && d.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.cargo && d.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.delegacia && d.delegacia.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.portariaOuObs && d.portariaOuObs.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const dpcCount = delegados.filter(d => (d.category || (d.id.startsWith('oip_') ? 'oip' : 'dpc')) === 'dpc').length;
  const oipCount = delegados.filter(d => (d.category || (d.id.startsWith('oip_') ? 'oip' : 'dpc')) === 'oip').length;

  return (
    <>
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm no-print overflow-y-auto"
        // Note: Backdrop click close removed per user specification
      >
        <div className={`border-2 rounded-3xl w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl flex flex-col my-auto ${
          isDark 
            ? 'bg-[#120f1e] border-purple-600/70 text-white shadow-purple-950/90' 
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}>
          
          {/* Header */}
          <div className={`p-4 sm:p-5 border-b-2 flex items-center justify-between shrink-0 ${
            isDark ? 'border-purple-900/50 bg-[#161226]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/70 text-purple-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    Catálogo de Autoridades & Oficiais (DPC / OIP)
                  </h2>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 border ${
                    isDark ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-900 border-purple-300'
                  }`}>
                    <Users className="w-3 h-3" />
                    Compartilhado • Todos os Usuários
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  }`}>
                    Sincronizado em Tempo Real
                  </span>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                  Gerencie as autoridades policiais (DPC) e oficiais de investigação (OIP). Dados disponíveis de forma síncrona para toda a equipe.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark 
                  ? 'text-zinc-300 hover:text-white hover:bg-purple-950/60 border-purple-900/40 hover:border-purple-500/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 border-slate-300'
              }`}
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CATEGORY TABS: DPC vs OIP */}
          <div className={`px-4 sm:px-5 pt-3 pb-0 border-b flex items-center gap-2 shrink-0 overflow-x-auto ${
            isDark ? 'bg-[#151025] border-purple-900/30' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('dpc');
                setIsAddingNew(false);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
                activeCategory === 'dpc'
                  ? isDark 
                    ? 'bg-[#181329] text-white border-purple-500 shadow-md' 
                    : 'bg-white text-purple-950 border-purple-500 shadow-sm'
                  : isDark 
                    ? 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-purple-950/30' 
                    : 'bg-transparent text-slate-600 hover:text-slate-950 border-transparent hover:bg-slate-200'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>DPC (Delegados de Polícia Civil)</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full border ${
                isDark ? 'bg-purple-900/60 text-purple-200 border-purple-700/40' : 'bg-purple-100 text-purple-950 border-purple-300'
              }`}>
                {dpcCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveCategory('oip');
                setIsAddingNew(false);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
                activeCategory === 'oip'
                  ? isDark 
                    ? 'bg-[#181329] text-white border-purple-500 shadow-md' 
                    : 'bg-white text-indigo-950 border-indigo-500 shadow-sm'
                  : isDark 
                    ? 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-purple-950/30' 
                    : 'bg-transparent text-slate-600 hover:text-slate-950 border-transparent hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>OIP (Oficiais de Investigação Policial)</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full border ${
                isDark ? 'bg-indigo-900/60 text-indigo-200 border-indigo-700/40' : 'bg-indigo-100 text-indigo-950 border-indigo-300'
              }`}>
                {oipCount}
              </span>
            </button>
          </div>

          {/* Informative Banner */}
          <div className={`px-4 sm:px-5 py-2 border-b flex items-center justify-between gap-3 text-xs ${
            isDark ? 'bg-[#181329] border-purple-900/30 text-zinc-300' : 'bg-purple-50 border-purple-200 text-purple-950'
          }`}>
            <div className="flex items-center gap-2">
              <Info className={`w-4 h-4 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
              <span>
                Visualizando categoria <strong>{activeCategory.toUpperCase()}</strong>. Todos os usuários podem gerenciar e sincronizar cadastros.
              </span>
            </div>
            <span className={`text-[11px] font-mono shrink-0 ${isDark ? 'text-purple-300/80' : 'text-purple-800'}`}>
              {filteredDelegados.length} {activeCategory.toUpperCase()} exibidos
            </span>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className={`mx-4 sm:mx-5 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}>
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Top action bar: Search & Add Button */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                <input
                  id="search-delegado-input"
                  type="text"
                  placeholder={`Buscar ${activeCategory.toUpperCase()} por nome, matrícula, cargo ou delegacia...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-all border ${
                    isDark 
                      ? 'bg-[#171326] border-purple-900/40 focus:border-purple-400 text-white placeholder-zinc-500' 
                      : 'bg-white border-slate-300 focus:border-purple-600 text-slate-900 placeholder-slate-400 shadow-sm'
                  }`}
                />
              </div>

              <button
                id="btn-add-delegado"
                type="button"
                onClick={handleStartAdd}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md ${
                  isDark
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/60 shadow-purple-950/50'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-2 border-purple-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar {activeCategory.toUpperCase()}</span>
              </button>
            </div>

            {/* New / Edit Form */}
            {isAddingNew && (
              <form onSubmit={handleSaveDelegado} className={`p-4 border-2 rounded-2xl space-y-3.5 shadow-xl animate-fade-in ${
                isDark ? 'bg-[#181329] border-purple-500/50' : 'bg-purple-50/60 border-purple-200'
              }`}>
                <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-purple-900/30' : 'border-purple-200'}`}>
                  <div className="flex items-center gap-2">
                    {formCategory === 'dpc' ? (
                      <Shield className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
                    ) : (
                      <UserCheck className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`} />
                    )}
                    <span className={`text-xs font-bold ${isDark ? 'text-purple-200' : 'text-purple-950'}`}>
                      {editingId ? `Editar ${formCategory.toUpperCase()}` : `Cadastrar Novo(a) ${formCategory.toUpperCase()}`}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      isDark ? 'bg-purple-900/60 text-purple-300 border-purple-700/50' : 'bg-purple-200 text-purple-950 border-purple-300'
                    }`}>
                      Sincronização Compartilhada
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingId(null);
                    }}
                    className={`text-xs cursor-pointer ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Categoria Funcional
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AuthorityCategory)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-purple-500'
                      }`}
                    >
                      <option value="dpc">DPC - Delegado de Polícia Civil</option>
                      <option value="oip">OIP - Oficial de Investigação Policial</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Nome Completo *
                    </label>
                    <input
                      id="form-delegado-nome"
                      type="text"
                      required
                      placeholder="Ex: Fernando Moretto Nachtigall"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Cargo / Função Oficial
                    </label>
                    <input
                      id="form-delegado-cargo"
                      type="text"
                      placeholder={formCategory === 'dpc' ? 'Ex: Delegado de Polícia Civil - Titular' : 'Ex: Oficial de Investigação Policial (OIP)'}
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Matrícula Funcional / Identificação
                    </label>
                    <input
                      id="form-delegado-matricula"
                      type="text"
                      placeholder="Ex: 301.942-1-0"
                      value={formMatricula}
                      onChange={(e) => setFormMatricula(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none font-mono border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Lotação / Unidade Policial
                    </label>
                    <input
                      id="form-delegado-delegacia"
                      type="text"
                      placeholder="Ex: 1ª Delegacia Metropolitana de Maracanaú"
                      value={formDelegacia}
                      onChange={(e) => setFormDelegacia(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                      Município / UF
                    </label>
                    <input
                      id="form-delegado-municipio"
                      type="text"
                      placeholder="Ex: Maracanaú/CE"
                      value={formMunicipio}
                      onChange={(e) => setFormMunicipio(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                        isDark 
                          ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-800'}`}>
                    Portaria de Designação / Observações
                  </label>
                  <input
                    id="form-delegado-obs"
                    type="text"
                    placeholder="Ex: Titular / Plantonista / Investigador Responsável"
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                      isDark 
                        ? 'bg-[#110d1e] border-purple-900/50 text-white placeholder-zinc-500 focus:border-purple-400' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-500'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingId(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                      isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-delegado"
                    type="submit"
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-950/40'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-950 border-2 border-purple-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar no Catálogo Compartilhado'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {filteredDelegados.length === 0 ? (
              <div className={`text-center py-10 rounded-2xl border ${
                isDark ? 'bg-[#161226] border-purple-900/30 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                {activeCategory === 'dpc' ? (
                  <Shield className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                ) : (
                  <UserCheck className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                )}
                <p className="text-xs font-medium">
                  Nenhum registro de {activeCategory.toUpperCase()} encontrado.
                </p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  Clique em "Adicionar {activeCategory.toUpperCase()}" acima para cadastrar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDelegados.map((delegado) => {
                  const isSelected = currentSelectedNome === delegado.nome;

                  return (
                    <div
                      key={delegado.id}
                      onClick={() => handleSelect(delegado)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 group ${
                        isSelected
                          ? isDark
                            ? 'bg-purple-950/70 border-purple-500/80 ring-1 ring-purple-500 shadow-lg shadow-purple-950/50'
                            : 'bg-purple-50 border-purple-400 ring-2 ring-purple-200 shadow-md'
                          : isDark
                            ? 'bg-[#171326] border-purple-900/30 hover:border-purple-500/50 hover:bg-purple-950/30'
                            : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                          isDark 
                            ? 'bg-purple-900/40 border-purple-500/30 text-purple-300' 
                            : 'bg-purple-100 border-purple-300 text-purple-950'
                        }`}>
                          {delegado.nome.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs sm:text-sm font-bold truncate ${
                              isDark ? 'text-white group-hover:text-purple-200' : 'text-slate-900 group-hover:text-purple-900'
                            }`}>
                              {delegado.nome}
                            </h4>
                          </div>
                          {delegado.matricula && (
                            <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded-md border ${
                              isDark 
                                ? 'text-purple-300 bg-purple-950/80 border-purple-800/40' 
                                : 'text-purple-950 bg-purple-100 border-purple-300 font-bold'
                            }`}>
                              Mat. {delegado.matricula}
                            </span>
                          )}
                          <p className={`text-[11px] mt-1 line-clamp-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                            {delegado.cargo} • <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{delegado.delegacia}</span>
                            {delegado.municipio ? ` - ${delegado.municipio}` : ''}
                          </p>
                          {delegado.portariaOuObs && (
                            <p className={`text-[10px] mt-0.5 line-clamp-1 italic ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                              {delegado.portariaOuObs}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center justify-between pt-2 border-t shrink-0 ${
                        isDark ? 'border-purple-900/20' : 'border-slate-100'
                      }`}>
                        {/* ACTION CONTROLS: EDIT & DELETE */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`edit-delegado-${delegado.id}`}
                            type="button"
                            onClick={(e) => handleStartEdit(delegado, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent ${
                              isDark 
                                ? 'text-zinc-400 hover:text-purple-200 hover:bg-purple-900/60 hover:border-purple-600/40' 
                                : 'text-slate-600 hover:text-slate-950 hover:bg-purple-100 hover:border-purple-300'
                            }`}
                            title={`Editar cadastro deste ${activeCategory.toUpperCase()}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-delegado-${delegado.id}`}
                            type="button"
                            onClick={(e) => handleRequestDelete(delegado, e)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent ${
                              isDark 
                                ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/60 hover:border-rose-600/40' 
                                : 'text-slate-600 hover:text-rose-700 hover:bg-rose-100 hover:border-rose-300'
                            }`}
                            title="Remover do catálogo compartilhado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* SELECTION BUTTON */}
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                          isSelected 
                            ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
                            : isDark
                              ? 'bg-[#211b36] text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
                              : 'bg-purple-100 text-purple-950 group-hover:bg-purple-200 border border-purple-200'
                        }`}>
                          {isSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Selecionado</span>
                            </>
                          ) : (
                            <span>Selecionar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Footer info */}
          <div className={`p-3.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'bg-[#161226] border-purple-900/40 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[11px] truncate max-w-[70%]">
              * A autoridade/oficial selecionado(a) é sincronizado(a) e pode ser vinculado(a) a documentos e pautas oficiais.
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              Fechar
            </button>
          </div>

        </div>
      </div>

      {/* IN-APP CONFIRMATION DIALOG FOR DELETE */}
      <ConfirmModal
        isOpen={Boolean(delegadoToDelete)}
        onClose={() => setDelegadoToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Registro de Autoridade/Oficial?"
        message={`Confirma a exclusão de "${delegadoToDelete?.nome}" do catálogo unificado? Esta ação é imediata e sincronizada para toda a unidade.`}
        confirmText="Sim, Excluir Registro"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
};
