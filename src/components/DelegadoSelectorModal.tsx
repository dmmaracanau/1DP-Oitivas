import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserCheck, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Shield, 
  FileBadge, 
  Search,
  Building2
} from 'lucide-react';
import { DelegadoInfo, delegadoService } from '../services/delegadoService';

interface DelegadoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDelegado: (delegado: DelegadoInfo) => void;
  currentSelectedNome?: string;
}

export const DelegadoSelectorModal: React.FC<DelegadoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectDelegado,
  currentSelectedNome
}) => {
  const [delegados, setDelegados] = useState<DelegadoInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formNome, setFormNome] = useState('');
  const [formCargo, setFormCargo] = useState('Delegado de Polícia Civil');
  const [formMatricula, setFormMatricula] = useState('');
  const [formDelegacia, setFormDelegacia] = useState('1ª Delegacia Metropolitana de Maracanaú');
  const [formMunicipio, setFormMunicipio] = useState('Maracanaú/CE');
  const [formObs, setFormObs] = useState('');

  useEffect(() => {
    if (isOpen) {
      const list = delegadoService.getDelegados();
      setDelegados(list);
      setIsAddingNew(false);
      setEditingId(null);
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingId(null);
    setFormNome('');
    setFormCargo('Delegado de Polícia Civil');
    setFormMatricula('');
    setFormDelegacia('1ª Delegacia Metropolitana de Maracanaú');
    setFormMunicipio('Maracanaú/CE');
    setFormObs('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (d: DelegadoInfo) => {
    setEditingId(d.id);
    setFormNome(d.nome);
    setFormCargo(d.cargo);
    setFormMatricula(d.matricula);
    setFormDelegacia(d.delegacia);
    setFormMunicipio(d.municipio);
    setFormObs(d.portariaOuObs || '');
    setIsAddingNew(true);
  };

  const handleSaveDelegado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    const newObj: DelegadoInfo = {
      id: editingId || `dpc_${Date.now()}`,
      nome: formNome.trim(),
      cargo: formCargo.trim() || 'Delegado de Polícia Civil',
      matricula: formMatricula.trim(),
      delegacia: formDelegacia.trim() || '1ª Delegacia Metropolitana de Maracanaú',
      municipio: formMunicipio.trim() || 'Maracanaú/CE',
      portariaOuObs: formObs.trim()
    };

    const updated = delegadoService.addOrUpdateDelegado(newObj);
    setDelegados(updated);
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Deseja remover este delegado do catálogo?')) {
      const updated = delegadoService.removeDelegado(id);
      setDelegados(updated);
    }
  };

  const filteredDelegados = delegados.filter(d => 
    d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cargo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-purple-950/70 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-800 border border-amber-400/40 flex items-center justify-center text-amber-200 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Autoridades Policiais (DPC)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  Assinatura Oficial
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Selecione o Delegado para preencher a marcação e assinar os Mandados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-purple-950/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Top action bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nome do delegado, matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Delegado</span>
            </button>
          </div>

          {/* New / Edit Form */}
          {isAddingNew && (
            <form onSubmit={handleSaveDelegado} className="p-4 bg-[#181329] border border-purple-500/40 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
                <span className="text-xs font-bold text-purple-300">
                  {editingId ? 'Editar Delegado' : 'Cadastrar Nova Autoridade Policial'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
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
                    type="text"
                    placeholder="Ex: Delegado de Polícia Civil"
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
                    type="text"
                    placeholder="Ex: 1ª Delegacia Metropolitana de Maracanaú"
                    value={formDelegacia}
                    onChange={(e) => setFormDelegacia(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/40"
                >
                  Salvar Autoridade
                </button>
              </div>
            </form>
          )}

          {/* List of Delegados */}
          <div className="space-y-2.5">
            {filteredDelegados.length === 0 ? (
              <div className="p-8 text-center bg-[#171326]/50 rounded-2xl border border-purple-900/30">
                <Shield className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Nenhum delegado encontrado com esse filtro.</p>
              </div>
            ) : (
              filteredDelegados.map((delegado) => {
                const isSelected = currentSelectedNome?.toLowerCase() === delegado.nome.toLowerCase();

                return (
                  <div
                    key={delegado.id}
                    onClick={() => {
                      onSelectDelegado(delegado);
                      onClose();
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                      isSelected
                        ? 'bg-purple-950/60 border-purple-500/80 ring-1 ring-purple-500 shadow-md shadow-purple-950/50'
                        : 'bg-[#171326] border-purple-900/30 hover:border-purple-500/50 hover:bg-purple-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#201a35] border border-purple-800/40 flex items-center justify-center text-purple-300 group-hover:border-purple-500 shrink-0">
                        <FileBadge className="w-5 h-5 text-amber-400" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-200">
                            {delegado.nome}
                          </h4>
                          {delegado.matricula && (
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-purple-900/40 text-purple-300 border border-purple-800/40 rounded-md">
                              Mat. {delegado.matricula}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {delegado.cargo} • <span className="text-zinc-300">{delegado.delegacia}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(delegado);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-purple-900/40 rounded-lg transition-colors"
                        title="Editar cadastro deste delegado"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(delegado.id, e)}
                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isSelected 
                          ? 'bg-purple-600 text-white shadow-sm' 
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
          <span className="text-[11px]">
            * O nome e matrícula do delegado selecionado serão impressos no Mandado de Intimação / PDF.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
