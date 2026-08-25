import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Shield, 
  ShieldCheck,
  Search,
  Building2,
  Sparkles,
  Info
} from 'lucide-react';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';
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
  user,
  isAdmin: isAdminProp
}) => {
  const isUserAdmin = Boolean(isAdminProp || user?.role === 'admin' || user?.isAdmin);

  const [delegados, setDelegados] = useState<DelegadoInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Exclusão via modal in-app (sem window.confirm)
  const [delegadoToDelete, setDelegadoToDelete] = useState<DelegadoInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form fields
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
    if (!isUserAdmin) return;
    setEditingId(null);
    setFormNome('');
    setFormCargo('Delegado de Polícia Civil');
    setFormMatricula('');
    setFormDelegacia('1ª Delegacia Metropolitana de Maracanaú');
    setFormMunicipio('Maracanaú/CE');
    setFormObs('');
    setFormFotoUrl('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (d: DelegadoInfo) => {
    if (!isUserAdmin) return;
    setEditingId(d.id);
    setFormNome(d.nome);
    setFormCargo(d.cargo || 'Delegado de Polícia Civil');
    setFormMatricula(d.matricula || '');
    setFormDelegacia(d.delegacia || '1ª Delegacia Metropolitana de Maracanaú');
    setFormMunicipio(d.municipio || 'Maracanaú/CE');
    setFormObs(d.portariaOuObs || '');
    setFormFotoUrl(d.fotoUrl || '');
    setIsAddingNew(true);
  };

  const handleSaveDelegado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserAdmin) {
      showMsg('Apenas administradores podem cadastrar ou editar Delegados.', 'error');
      return;
    }

    if (!formNome.trim()) {
      showMsg('O nome do Delegado é obrigatório.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const newObj: DelegadoInfo = {
        id: editingId || `dpc_${Date.now()}`,
        nome: formNome.trim(),
        cargo: formCargo.trim() || 'Delegado de Polícia Civil',
        matricula: formMatricula.trim(),
        delegacia: formDelegacia.trim() || '1ª Delegacia Metropolitana de Maracanaú',
        municipio: formMunicipio.trim() || 'Maracanaú/CE',
        portariaOuObs: formObs.trim() || '',
        fotoUrl: formFotoUrl.trim() || ''
      };

      await delegadoService.addOrUpdateDelegado(newObj);
      showMsg(`Delegado(a) "${newObj.nome}" salvo com sucesso no catálogo unificado!`, 'success');
      setIsAddingNew(false);
      setEditingId(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao salvar delegado.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (delegado: DelegadoInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUserAdmin) {
      showMsg('Apenas administradores podem remover autoridades do catálogo.', 'error');
      return;
    }
    // Abre a confirmação nativa in-app do React sem bloquear ou sofrer restrições de iframe
    setDelegadoToDelete(delegado);
  };

  const handleConfirmDelete = async () => {
    if (!delegadoToDelete) return;
    setIsDeleting(true);
    try {
      const nomeRemovido = delegadoToDelete.nome;
      await delegadoService.removeDelegado(delegadoToDelete.id);
      showMsg(`Delegado(a) "${nomeRemovido}" foi removido(a) com sucesso do catálogo unificado.`, 'success');
      setDelegadoToDelete(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao remover delegado.', 'error');
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

  const filteredDelegados = delegados.filter(d => 
    (d.nome && d.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.matricula && d.matricula.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.cargo && d.cargo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.delegacia && d.delegacia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
        <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-[88vw] max-w-5xl overflow-hidden shadow-2xl shadow-purple-950/70 flex flex-col max-h-[88vh]">
          
          {/* Header */}
          <div className="p-5 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-md ${
                isUserAdmin 
                  ? 'bg-gradient-to-br from-amber-500 to-purple-900 border-amber-400/40 text-amber-200' 
                  : 'bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/30 text-purple-200'
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Catálogo Unificado de Autoridades Policiais (DPC)
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                    Compartilhado
                  </span>
                  {isUserAdmin && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      ADMINISTRADOR
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">
                  Lista unificada sincronizada na nuvem para preenchimento de oitivas e assinatura de mandados
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Informative Banner */}
          <div className="bg-[#151025] px-5 py-2.5 border-b border-purple-900/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                {isUserAdmin ? (
                  <span>Você possui <strong>privilégio de Administrador</strong> para criar, editar ou excluir qualquer DPC do catálogo unificado.</span>
                ) : (
                  <span>Catálogo oficial gerido por Administradores. Qualquer servidor pode <strong>selecionar livremente</strong> qualquer autoridade policial.</span>
                )}
              </span>
            </div>
            <span className="text-[11px] text-purple-300/70 font-mono shrink-0">
              {delegados.length} {delegados.length === 1 ? 'autoridade' : 'autoridades'}
            </span>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div className={`mx-5 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}>
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Top action bar: Search & (Admin Only) New Delegado Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  id="search-delegado-input"
                  type="text"
                  placeholder="Buscar por nome do delegado, matrícula, delegacia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* ONLY ADMIN CAN SEE AND CLICK "NOVO DELEGADO" */}
              {isUserAdmin && (
                <button
                  id="btn-admin-add-delegado"
                  type="button"
                  onClick={handleStartAdd}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-md shadow-amber-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo DPC (Admin)</span>
                </button>
              )}
            </div>

            {/* New / Edit Form (Admin Only) */}
            {isAddingNew && isUserAdmin && (
              <form onSubmit={handleSaveDelegado} className="p-4 bg-[#181329] border border-amber-500/40 rounded-2xl space-y-3 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">
                      {editingId ? 'Editar Autoridade Policial (DPC)' : 'Cadastrar Nova Autoridade Policial no Catálogo Unificado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Nome Completo do Delegado(a) *
                    </label>
                    <input
                      id="form-delegado-nome"
                      type="text"
                      required
                      placeholder="Ex: Fernando Moretto Nachtigall"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
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
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Cargo / Função Oficial
                    </label>
                    <input
                      id="form-delegado-cargo"
                      type="text"
                      placeholder="Ex: Delegado de Polícia Civil - Titular"
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
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

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Portaria de Designação / Observações
                    </label>
                    <input
                      id="form-delegado-obs"
                      type="text"
                      placeholder="Ex: Portaria nº 123/2024 - Titular"
                      value={formObs}
                      onChange={(e) => setFormObs(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-submit-delegado"
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar no Catálogo Unificado'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            <div className="space-y-2.5">
              {filteredDelegados.length === 0 ? (
                <div className="text-center py-10 bg-[#161226] rounded-2xl border border-purple-900/30">
                  <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">Nenhum Delegado(a) encontrado.</p>
                </div>
              ) : (
                filteredDelegados.map((delegado) => {
                  const isSelected = currentSelectedNome === delegado.nome;

                  return (
                    <div
                      key={delegado.id}
                      onClick={() => handleSelect(delegado)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                        isSelected
                          ? 'bg-purple-950/70 border-purple-500/80 ring-1 ring-purple-500 shadow-lg shadow-purple-950/50'
                          : 'bg-[#171326] border-purple-900/30 hover:border-purple-500/50 hover:bg-purple-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0">
                          {delegado.nome.charAt(0)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-200">
                              {delegado.nome}
                            </h4>
                            {delegado.matricula && (
                              <span className="px-2 py-0.5 text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-800/40 rounded-md">
                                Mat. {delegado.matricula}
                              </span>
                            )}
                            {delegado.portariaOuObs && (
                              <span className="px-2 py-0.5 text-[10px] text-zinc-400 bg-zinc-900/60 rounded-md">
                                {delegado.portariaOuObs}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {delegado.cargo} • <span className="text-zinc-300">{delegado.delegacia}</span>
                            {delegado.municipio ? ` - ${delegado.municipio}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* ADMIN-ONLY CONTROLS: EDIT & DELETE */}
                        {isUserAdmin && (
                          <>
                            <button
                              id={`edit-delegado-${delegado.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(delegado);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Editar cadastro deste delegado (Admin)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`delete-delegado-${delegado.id}`}
                              type="button"
                              onClick={(e) => handleRequestDelete(delegado, e)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Remover autoridade do catálogo (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* SELECTION BUTTON (AVAILABLE TO ALL USERS) */}
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
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
                })
              )}
            </div>

          </div>

          {/* Footer info */}
          <div className="p-3.5 bg-[#161226] border-t border-purple-900/40 flex items-center justify-between text-xs text-zinc-400">
            <span className="text-[11px] truncate max-w-[70%]">
              * O nome e matrícula da autoridade selecionada são impressos no Mandado de Intimação / PDF.
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

      {/* IN-APP CONFIRMATION DIALOG FOR DELETE (Never blocked by iframe sandbox) */}
      <ConfirmModal
        isOpen={Boolean(delegadoToDelete)}
        onClose={() => setDelegadoToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir Autoridade Policial?"
        message={`Confirma a exclusão de "${delegadoToDelete?.nome}" do catálogo unificado de delegados? Esta ação é imediata e será sincronizada para todos os servidores da unidade policial.`}
        confirmText="Sim, Excluir Autoridade"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
};
