import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitMerge, 
  ShieldCheck, 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Sparkles, 
  Building2, 
  Phone, 
  Layers, 
  Trash2,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';
import { UserProfile, DuplicateUserGroup, MergeUsersResult } from '../types/oitiva';
import { authService } from '../services/authService';

interface UnifyDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: DuplicateUserGroup[];
  allUsers: UserProfile[];
  initialSelectedGroup?: DuplicateUserGroup | null;
  onUnificationComplete: (resultMsg: string) => void;
}

export const UnifyDuplicatesModal: React.FC<UnifyDuplicatesModalProps> = ({
  isOpen,
  onClose,
  duplicateGroups,
  allUsers,
  initialSelectedGroup,
  onUnificationComplete
}) => {
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [primaryUid, setPrimaryUid] = useState<string>('');
  const [oitivasCounts, setOitivasCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<boolean>(false);
  const [merging, setMerging] = useState<boolean>(false);
  const [batchMerging, setBatchMerging] = useState<boolean>(false);
  const [customOptions, setCustomOptions] = useState<{
    customDisplayName?: string;
    customUsername?: string;
    customCargo?: string;
    customUnitName?: string;
    customPhone?: string;
    makeAdmin?: boolean;
  }>({});

  // Active group
  const currentGroup = duplicateGroups[selectedGroupIndex] || duplicateGroups[0] || initialSelectedGroup || null;

  // Set initial group index if initialSelectedGroup is passed
  useEffect(() => {
    if (initialSelectedGroup && duplicateGroups.length > 0) {
      const idx = duplicateGroups.findIndex(g => g.id === initialSelectedGroup.id);
      if (idx >= 0) {
        setSelectedGroupIndex(idx);
      }
    }
  }, [initialSelectedGroup, duplicateGroups]);

  // When active group changes, set default primary UID
  useEffect(() => {
    if (currentGroup && currentGroup.users.length > 0) {
      // Pick first user as default primary
      const defaultPrimary = currentGroup.users[0].uid;
      setPrimaryUid(defaultPrimary);
      setCustomOptions({});

      // Fetch oitivas counts for all users in the group
      setLoadingCounts(true);
      const fetchCounts = async () => {
        const counts: Record<string, number> = {};
        for (const u of currentGroup.users) {
          try {
            counts[u.uid] = await authService.getOitivasCountForUser(u.uid);
          } catch {
            counts[u.uid] = 0;
          }
        }
        setOitivasCounts(prev => ({ ...prev, ...counts }));
        setLoadingCounts(false);
      };

      fetchCounts();
    }
  }, [currentGroup?.id, selectedGroupIndex]);

  if (!isOpen || !currentGroup) return null;

  const primaryUser = currentGroup.users.find(u => u.uid === primaryUid) || currentGroup.users[0];
  const secondaryUsers = currentGroup.users.filter(u => u.uid !== primaryUser?.uid);

  // Total oitivas across the group
  const totalGroupOitivas = currentGroup.users.reduce((acc, u) => acc + (oitivasCounts[u.uid] || 0), 0);

  // Executar unificação do grupo ativo
  const handleExecuteMerge = async () => {
    if (!primaryUser) return;
    const secondaryUids = secondaryUsers.map(u => u.uid);
    if (secondaryUids.length === 0) {
      alert("Selecione ao menos uma conta secundária para unificação.");
      return;
    }

    setMerging(true);
    try {
      const result: MergeUsersResult = await authService.mergeDuplicateUsers(
        primaryUser.uid, 
        secondaryUids, 
        customOptions
      );

      onUnificationComplete(result.message);
      
      // Se era o último grupo, fecha modal
      if (duplicateGroups.length <= 1) {
        onClose();
      } else {
        setSelectedGroupIndex(0);
      }
    } catch (err: any) {
      alert("Erro durante a unificação: " + (err.message || 'Erro desconhecido'));
    } finally {
      setMerging(false);
    }
  };

  // Executar unificação de TODOS os grupos duplicados automaticamente
  const handleBatchMergeAll = async () => {
    if (!window.confirm(`Deseja unificar automaticamente todos os ${duplicateGroups.length} grupos de usuários duplicados identificados? Todas as oitivas serão preservadas nas contas principais.`)) {
      return;
    }

    setBatchMerging(true);
    try {
      const res = await authService.unifyAllDuplicates(duplicateGroups);
      onUnificationComplete(
        `Unificação em lote concluída com sucesso! ${res.unifiedGroupsCount} grupo(s) processado(s), ${res.mergedUsersCount} conta(s) secundária(s) eliminada(s) e ${res.transferredOitivasCount} oitiva(s) transferida(s).`
      );
      onClose();
    } catch (err: any) {
      alert("Erro na unificação em lote: " + (err.message || 'Erro desconhecido'));
    } finally {
      setBatchMerging(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto no-print"
      // Note: Backdrop click close removed per user specification
    >
      <div className="bg-[#120d22] border-2 border-amber-500/60 rounded-3xl w-[95vw] max-w-4xl h-[95vh] max-h-[95vh] overflow-hidden shadow-2xl shadow-amber-950/40 flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-amber-500/30 bg-[#1a1230] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-purple-900 border border-amber-400/50 flex items-center justify-center text-amber-200 shadow-md">
              <GitMerge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Unificação de Usuários Duplicados
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {duplicateGroups.length} Grupo(s) Detectado(s)
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Funda contas com o mesmo nome de usuário ou e-mail, preservando todas as oitivas na conta principal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-white rounded-xl transition-colors hover:bg-purple-950/60 border border-purple-900/40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Groups selector tabs if multiple */}
        {duplicateGroups.length > 1 && (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-[#150f28] border-b border-purple-900/30 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Grupos:
            </span>
            {duplicateGroups.map((group, idx) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupIndex(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroupIndex === idx
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-[#1e1638] text-zinc-300 hover:bg-purple-900/40 border border-purple-900/40'
                }`}
              >
                <span>Grupo #{idx + 1}</span>
                <span className="text-[10px] opacity-80">({group.users.length} contas)</span>
              </button>
            ))}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Group Match Summary Card */}
          <div className="bg-[#18122d] border border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {currentGroup.matchType === 'username_and_email' ? 'Mesmo Usuário & E-mail' : 
                   currentGroup.matchType === 'username' ? 'Mesmo Nome de Usuário' : 
                   currentGroup.matchType === 'email' ? 'Mesmo E-mail' : 'Duplicidade Manual'}
                </span>
                <span className="text-xs text-zinc-300 font-mono font-bold">
                  {currentGroup.matchedKey}
                </span>
              </div>
              <p className="text-xs text-zinc-300">
                Selecione abaixo qual perfil será o <strong className="text-amber-300">Destino Principal</strong>. As demais contas serão fundidas e removidas, e suas <strong className="text-purple-300">{totalGroupOitivas} oitiva(s)</strong> serão transferidas.
              </p>
            </div>

            {duplicateGroups.length > 1 && (
              <button
                type="button"
                onClick={handleBatchMergeAll}
                disabled={batchMerging || merging}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{batchMerging ? 'Unificando Tudo...' : '⚡ Unificar Todos os Grupos'}</span>
              </button>
            )}
          </div>

          {/* User Selection Comparison Cards */}
          <div>
            <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Escolha a Conta Principal de Destino ({currentGroup.users.length} contas detectadas)</span>
              </span>
              <span className="text-[11px] text-zinc-400 normal-case">
                Clique no card para definir como principal
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentGroup.users.map((u) => {
                const isSelectedPrimary = primaryUid === u.uid;
                const isAdmin = u.role === 'admin' || Boolean(u.isAdmin);
                const count = oitivasCounts[u.uid] ?? 0;

                return (
                  <div
                    key={u.uid}
                    onClick={() => setPrimaryUid(u.uid)}
                    className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelectedPrimary
                        ? 'bg-[#221740] border-amber-400 shadow-xl shadow-amber-950/50 ring-2 ring-amber-500/20'
                        : 'bg-[#151028] border-purple-900/40 hover:border-purple-600/50 hover:bg-[#1a1333]'
                    }`}
                  >
                    {/* Top Row: Badge & Radio */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSelectedPrimary ? (
                          <span className="px-2.5 py-1 bg-amber-500 text-black text-[11px] font-black rounded-lg flex items-center gap-1 shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            CONTA PRINCIPAL (DESTINO)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-purple-950/80 text-purple-300 border border-purple-800 text-[11px] font-bold rounded-lg flex items-center gap-1">
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            SERÁ FUNDIDA & REMOVIDA
                          </span>
                        )}

                        {isAdmin && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            ADMIN
                          </span>
                        )}
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelectedPrimary ? 'border-amber-400 bg-amber-500' : 'border-zinc-500 bg-transparent'
                      }`}>
                        {isSelectedPrimary && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="flex items-center gap-3.5 mb-4">
                      {u.photoURL ? (
                        <img 
                          src={u.photoURL} 
                          alt="" 
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-500/40 shrink-0" 
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelectedPrimary 
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-purple-950/80 border-purple-700 text-purple-300'
                        }`}>
                          {u.displayName ? u.displayName.substring(0, 2).toUpperCase() : 'OP'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">
                          {u.displayName || 'Sem Nome'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
                          <span>@{u.username || 'sem_usuario'}</span>
                        </div>
                        <div className="text-xs text-zinc-300 truncate mt-0.5">
                          {u.email || 'Sem e-mail'}
                        </div>
                      </div>
                    </div>

                    {/* Meta info: Cargo, Unit, Oitivas */}
                    <div className="space-y-1.5 pt-3 border-t border-purple-900/30 text-xs text-zinc-300">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Cargo:</span>
                        <span className="font-medium text-white">{u.cargo || 'Inspetor(a) de Polícia'}</span>
                      </div>
                      
                      {u.registrationNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Matrícula:</span>
                          <span className="font-mono text-zinc-200">{u.registrationNumber}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Lotação:</span>
                        <span className="text-zinc-200 truncate max-w-[180px]">{u.unitName || '1ª Delegacia de Maracanaú'}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-purple-300 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Oitivas Vinculadas:
                        </span>
                        <span className="px-2 py-0.5 bg-purple-950 border border-purple-700/50 text-purple-200 font-bold rounded-md">
                          {loadingCounts ? '...' : `${count} oitiva(s)`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono">
                        <span>UID: {u.uid.substring(0, 18)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Merge Result Preview & Explanatory Box */}
          <div className="bg-[#18112e] border border-purple-800/40 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Resumo do Processo de Unificação</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#110c22] rounded-xl border border-purple-900/30">
                <span className="text-zinc-400 block text-[11px]">Conta Preservada:</span>
                <strong className="text-white font-bold block mt-1 truncate">
                  {primaryUser?.displayName || primaryUser?.username}
                </strong>
                <span className="text-[10px] text-purple-300 font-mono">@{primaryUser?.username}</span>
              </div>

              <div className="p-3 bg-[#110c22] rounded-xl border border-purple-900/30">
                <span className="text-zinc-400 block text-[11px]">Contas a Remover:</span>
                <strong className="text-rose-300 font-bold block mt-1">
                  {secondaryUsers.length} conta(s) duplicada(s)
                </strong>
                <span className="text-[10px] text-zinc-400">Liberando banco de dados</span>
              </div>

              <div className="p-3 bg-[#110c22] rounded-xl border border-purple-900/30">
                <span className="text-zinc-400 block text-[11px]">Oitivas Agendadas:</span>
                <strong className="text-emerald-300 font-bold block mt-1">
                  {totalGroupOitivas} oitiva(s) total
                </strong>
                <span className="text-[10px] text-zinc-400">100% transferidas sem perdas</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-300 space-y-1 bg-purple-950/30 p-3 rounded-xl border border-purple-900/40">
              <p>✓ <strong>Sem Duplicatas de Agendamento:</strong> Agendamentos iguais (mesma pessoa, data/horário ou procedimento) são unificados e consolidados, complementando campos em branco.</p>
              <p>✓ <strong>Adição de Agendamentos Distintos:</strong> Todas as oitivas diferentes são adicionadas à conta principal sem perdas.</p>
              <p>✓ <strong>Preservação Integral de Perfil:</strong> Informações complementares de cargo, matrícula, e-mail e telefone são fundidas com segurança.</p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-amber-500/30 bg-[#160f2a] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={merging || batchMerging}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              id="btn-execute-unify-group"
              type="button"
              onClick={handleExecuteMerge}
              disabled={merging || batchMerging || !primaryUser || secondaryUsers.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-amber-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <GitMerge className="w-4 h-4 stroke-[2.5]" />
              <span>{merging ? 'Unificando...' : `Unificar ${currentGroup.users.length} Contas deste Grupo`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
