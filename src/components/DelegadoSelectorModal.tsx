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
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-[#120f1e] border-2 border-purple-600/70 rounded-3xl w-[92vw] max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/90 flex flex-col my-auto">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center shadow-md bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/70 text-purple-200">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Catálogo de Autoridades & Oficiais (DPC / OIP)
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3 text-purple-300" />
                    Compartilhado • Todos os Usuários
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                    Sincronizado em Tempo Real
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Gerencie as autoridades policiais (DPC) e oficiais de investigação (OIP). Dados disponíveis de forma síncrona para toda a equipe.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-300 hover:text-white rounded-xl hover:bg-purple-950/60 border border-purple-900/40 hover:border-purple-500/50 transition-colors cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CATEGORY TABS: DPC vs OIP */}
          <div className="px-4 sm:px-5 pt-3 pb-0 bg-[#151025] border-b border-purple-900/30 flex items-center gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveCategory('dpc');
                setIsAddingNew(false);
                setEditingId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all cursor-pointer ${
                activeCategory === 'dpc'
                  ? 'bg-[#181329] text-white border-purple-500 shadow-md'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-purple-950/30'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>DPC (Delegados de Polícia Civil)</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-purple-900/60 text-purple-200 rounded-full border border-purple-700/40">
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
                  ? 'bg-[#181329] text-white border-purple-500 shadow-md'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-purple-950/30'
              }`}
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>OIP (Oficiais de Investigação Policial)</span>
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-indigo-900/60 text-indigo-200 rounded-full border border-indigo-700/40">
                {oipCount}
              </span>
            </button>
          </div>

          {/* Informative Banner */}
          <div className="bg-[#181329] px-4 sm:px-5 py-2 border-b border-purple-900/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Visualizando categoria <strong>{activeCategory.toUpperCase()}</strong>. Todos os usuários podem gerenciar e sincronizar cadastros.
              </span>
            </div>
            <span className="text-[11px] text-purple-300/80 font-mono shrink-0">
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
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="search-delegado-input"
                  type="text"
                  placeholder={`Buscar ${activeCategory.toUpperCase()} por nome, matrícula, cargo ou delegacia...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <button
                id="btn-add-delegado"
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/60 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md shadow-purple-950/50"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar {activeCategory.toUpperCase()}</span>
              </button>
            </div>

            {/* New / Edit Form */}
            {isAddingNew && (
              <form onSubmit={handleSaveDelegado} className="p-4 bg-[#181329] border-2 border-purple-500/50 rounded-2xl space-y-3.5 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
                  <div className="flex items-center gap-2">
                    {formCategory === 'dpc' ? (
                      <Shield className="w-4 h-4 text-purple-400" />
                    ) : (
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                    )}
                    <span className="text-xs font-bold text-purple-200">
                      {editingId ? `Editar ${formCategory.toUpperCase()}` : `Cadastrar Novo(a) ${formCategory.toUpperCase()}`}
                    </span>
                    <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/50">
                      Sincronização Compartilhada
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingId(null);
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Categoria Funcional
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as AuthorityCategory)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="dpc">DPC - Delegado de Polícia Civil</option>
                      <option value="oip">OIP - Oficial de Investigação Policial</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      id="form-delegado-nome"
                      type="text"
                      required
                      placeholder="Ex: Fernando Moretto Nachtigall"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    >
                    </input>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Cargo / Função Oficial
                    </label>
                    <input
                      id="form-delegado-cargo"
                      type="text"
                      placeholder={formCategory === 'dpc' ? 'Ex: Delegado de Polícia Civil - Titular' : 'Ex: Oficial de Investigação Policial (OIP)'}
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Matrícula Funcional / Identificação
                    </label>
                    <input
                      id="form-delegado-matricula"
                      type="text"
                      placeholder="Ex: 301.942-1-0"
                      value={formMatricula}
                      onChange={(e) => setFormMatricula(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Lotação / Unidade Policial
                    </label>
                    <input
                      id="form-delegado-delegacia"
                      type="text"
                      placeholder="Ex: 1ª Delegacia Metropolitana de Maracanaú"
                      value={formDelegacia}
                      onChange={(e) => setFormDelegacia(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Município / UF
                    </label>
                    <input
                      id="form-delegado-municipio"
                      type="text"
                      placeholder="Ex: Maracanaú/CE"
                      value={formMunicipio}
                      onChange={(e) => setFormMunicipio(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                    Portaria de Designação / Observações
                  </label>
                  <input
                    id="form-delegado-obs"
                    type="text"
                    placeholder="Ex: Titular / Plantonista / Investigador Responsável"
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingId(null);
                    }}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-delegado"
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar no Catálogo Compartilhado'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {filteredDelegados.length === 0 ? (
              <div className="text-center py-10 bg-[#161226] rounded-2xl border border-purple-900/30">
                {activeCategory === 'dpc' ? (
                  <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                ) : (
                  <UserCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                )}
                <p className="text-xs text-zinc-300 font-medium">
                  Nenhum registro de {activeCategory.toUpperCase()} encontrado.
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
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
                          ? 'bg-purple-950/70 border-purple-500/80 ring-1 ring-purple-500 shadow-lg shadow-purple-950/50'
                          : 'bg-[#171326] border-purple-900/30 hover:border-purple-500/50 hover:bg-purple-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0 mt-0.5">
                          {delegado.nome.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-200 truncate">
                              {delegado.nome}
                            </h4>
                          </div>
                          {delegado.matricula && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800/40 rounded-md">
                              Mat. {delegado.matricula}
                            </span>
                          )}
                          <p className="text-[11px] text-zinc-300 mt-1 line-clamp-1">
                            {delegado.cargo} • <span className="text-zinc-200">{delegado.delegacia}</span>
                            {delegado.municipio ? ` - ${delegado.municipio}` : ''}
                          </p>
                          {delegado.portariaOuObs && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1 italic">
                              {delegado.portariaOuObs}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-purple-900/20 shrink-0">
                        {/* ACTION CONTROLS: EDIT & DELETE */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`edit-delegado-${delegado.id}`}
                            type="button"
                            onClick={(e) => handleStartEdit(delegado, e)}
                            className="p-1.5 text-zinc-400 hover:text-purple-200 hover:bg-purple-900/60 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-purple-600/40"
                            title={`Editar cadastro deste ${activeCategory.toUpperCase()}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-delegado-${delegado.id}`}
                            type="button"
                            onClick={(e) => handleRequestDelete(delegado, e)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-600/40"
                            title="Remover do catálogo compartilhado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* SELECTION BUTTON */}
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                          isSelected 
                            ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400' 
                            : 'bg-[#211b36] text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
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
          <div className="p-3.5 bg-[#161226] border-t border-purple-900/40 flex items-center justify-between text-xs text-zinc-400">
            <span className="text-[11px] truncate max-w-[70%]">
              * A autoridade/oficial selecionado(a) é sincronizado(a) e pode ser vinculado(a) a documentos e pautas oficiais.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
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
