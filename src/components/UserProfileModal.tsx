import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  BadgeCheck, 
  Building2, 
  Phone, 
  Save, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Link as LinkIcon,
  RefreshCw,
  LogOut,
  AtSign,
  Trash2,
  Users,
  UserPlus,
  Edit3,
  Search,
  ShieldCheck,
  Check,
  AlertTriangle,
  FileText,
  GitMerge,
  Layers,
  HardDriveDownload
} from 'lucide-react';
import { UserProfile, DuplicateUserGroup, Oitiva, CalendarSpecialDate } from '../types/oitiva';
import { authService } from '../services/authService';
import { UnifyDuplicatesModal } from './UnifyDuplicatesModal';
import { UserBackupPanel } from './UserBackupPanel';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenWorkspaceModal?: () => void;
  onOpenDelegadosModal?: () => void;
  oitivas?: Oitiva[];
  specialDates?: CalendarSpecialDate[];
  onDataRestored?: () => void;
}

const CARGO_SUGGESTIONS = [
  'Delegado(a) de Polícia',
  'Delegado(a) Titular',
  'Delegado(a) Adjunto(a)',
  'Escrivão(ã) de Polícia',
  'Escrivão(ã) Chefe de Cartório',
  'Inspetor(a) de Polícia',
  'Inspetor(a) Chefe de Investigação',
  'Operador(a) de Cartório',
  'Agente Policial',
  'Administrador(a) do Sistema'
];

const PRESET_AVATARS = [
  { id: 'shield', label: 'Distintivo Policial', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=120&auto=format&fit=crop&q=80' },
  { id: 'officer1', label: 'Policial Civil Masc.', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80' },
  { id: 'officer2', label: 'Policial Civil Fem.', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80' },
  { id: 'cartorio', label: 'Cartório Judiciário', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=120&auto=format&fit=crop&q=80' }
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onOpenWorkspaceModal,
  onOpenDelegadosModal,
  oitivas = [],
  specialDates = [],
  onDataRestored
}) => {
  const isAdminUser = user?.role === 'admin' || Boolean(user?.isAdmin);

  const [activeTab, setActiveTab] = useState<'functional' | 'account' | 'security' | 'backup_data' | 'admin_users'>('functional');
  
  // Profile Form States
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [cargo, setCargo] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [unitName, setUnitName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // Password Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback States
  const [saving, setSaving] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showConfirmDeleteAccount, setShowConfirmDeleteAccount] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // =========================================================================
  // ADMIN USER MANAGEMENT STATES
  // =========================================================================
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'admin' | 'user' | 'duplicates'>('all');
  const [adminLoading, setAdminLoading] = useState(false);
  const [isUnifyModalOpen, setIsUnifyModalOpen] = useState(false);
  const [selectedGroupForUnify, setSelectedGroupForUnify] = useState<DuplicateUserGroup | null>(null);
  const [selectedUidsForManualMerge, setSelectedUidsForManualMerge] = useState<string[]>([]);

  // Detecção automática de grupos de usuários duplicados (mesmo username ou email)
  const duplicateGroups = useMemo(() => {
    return authService.findDuplicateGroups(allUsers);
  }, [allUsers]);

  const duplicateUidSet = useMemo(() => {
    const set = new Set<string>();
    duplicateGroups.forEach(g => g.users.forEach(u => set.add(u.uid)));
    return set;
  }, [duplicateGroups]);

  // Admin: Create User Modal
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminCargo, setNewAdminCargo] = useState('Inspetor(a) de Polícia');
  const [newAdminUnit, setNewAdminUnit] = useState('1ª Delegacia Metropolitana de Maracanaú');
  const [newAdminPhone, setNewAdminPhone] = useState('(85) 3101-2830');
  const [newAdminDepartment, setNewAdminDepartment] = useState('Cartório de Oitivas');
  const [newAdminIsAdmin, setNewAdminIsAdmin] = useState(false);

  // Admin: Edit User Modal
  const [editingTargetUser, setEditingTargetUser] = useState<UserProfile | null>(null);
  const [editAdminDisplayName, setEditAdminDisplayName] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminCargo, setEditAdminCargo] = useState('');
  const [editAdminRegistration, setEditAdminRegistration] = useState('');
  const [editAdminUnit, setEditAdminUnit] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [editAdminDepartment, setEditAdminDepartment] = useState('');
  const [editAdminIsAdmin, setEditAdminIsAdmin] = useState(false);
  const [editAdminNewPassword, setEditAdminNewPassword] = useState('');

  // Admin: Delete User Confirmation
  const [deletingTargetUser, setDeletingTargetUser] = useState<UserProfile | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setDisplayName(user.displayName || '');
      setCargo(user.cargo || 'Inspetor(a) de Polícia');
      setRegistrationNumber(user.registrationNumber || '');
      setInstitutionalEmail(user.institutionalEmail || '');
      setUnitName(user.unitName || '1ª Delegacia Metropolitana de Maracanaú');
      setPhone(user.phone || '');
      setDepartment(user.department || 'Cartório de Oitivas');
      setAccountEmail(user.email || 'delegaciammaracanau@gmail.com');
      setPhotoURL(user.photoURL || '');
    }
    setFeedback(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowConfirmDeleteAccount(false);
  }, [user, isOpen]);

  // Real-time listener for all users if logged in user is admin
  useEffect(() => {
    if (!isOpen || !isAdminUser) return;

    setAdminLoading(true);
    const unsubscribe = authService.subscribeToAllUsers((usersList) => {
      setAllUsers(usersList);
      setAdminLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, isAdminUser]);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Salvar alterações de perfil próprio
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showMsg('O nome completo é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateUserProfile({
        username: username.trim().toLowerCase().replace(/[^a-z0-9_.]/g, ''),
        displayName: displayName.trim(),
        cargo: cargo.trim(),
        registrationNumber: registrationNumber.trim(),
        institutionalEmail: institutionalEmail.trim(),
        unitName: unitName.trim(),
        phone: phone.trim(),
        department: department.trim(),
        email: accountEmail.trim(),
        photoURL: photoURL.trim() || null
      });

      onUpdateProfile(updated);
      showMsg('Perfil funcional atualizado com sucesso!', 'success');
    } catch (err: any) {
      showMsg(err.message || 'Erro ao atualizar perfil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Alterar senha própria
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showMsg('Informe a nova senha.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMsg('A confirmação de senha não confere.', 'error');
      return;
    }

    setPassLoading(true);
    try {
      await authService.updateUserPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showMsg('Senha alterada com sucesso!', 'success');
    } catch (err: any) {
      showMsg(err.message || 'Erro ao alterar senha.', 'error');
    } finally {
      setPassLoading(false);
    }
  };

  // Enviar link de recuperação de senha para o email da conta
  const handleSendPasswordReset = async () => {
    if (!accountEmail || !accountEmail.includes('@')) {
      showMsg('Informe um e-mail de conta válido.', 'error');
      return;
    }

    setResetLoading(true);
    try {
      await authService.sendPasswordReset(accountEmail);
      showMsg(`Link de redefinição de senha enviado para: ${accountEmail}`, 'success');
    } catch (err: any) {
      showMsg(err.message || 'Erro ao enviar e-mail de recuperação.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Excluir a própria conta
  const handleDeleteMyAccount = async () => {
    setDeleteAccountLoading(true);
    try {
      await authService.deleteCurrentUserAccount();
      showMsg('Sua conta foi excluída com sucesso.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao excluir conta.', 'error');
      setDeleteAccountLoading(false);
    }
  };

  // Conectar com Google Workspace / Gmail
  const handleConnectGoogle = async () => {
    try {
      const res = await authService.loginWithGoogle();
      onUpdateProfile(res.profile);
      showMsg('Conta Google / Gmail conectada com sucesso!', 'success');
    } catch (err: any) {
      showMsg('Não foi possível conectar com o Google no momento.', 'error');
    }
  };

  // =========================================================================
  // ADMIN ACTIONS
  // =========================================================================

  // Abrir modal de criação de usuário pelo Admin
  const handleOpenCreateUser = () => {
    setNewAdminUsername('');
    setNewAdminDisplayName('');
    setNewAdminEmail('');
    setNewAdminPassword('');
    setNewAdminCargo('Inspetor(a) de Polícia');
    setNewAdminUnit('1ª Delegacia Metropolitana de Maracanaú');
    setNewAdminPhone('(85) 3101-2830');
    setNewAdminDepartment('Cartório de Oitivas');
    setNewAdminIsAdmin(false);
    setIsCreatingUser(true);
  };

  // Submeter criação de usuário pelo Admin
  const handleAdminCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      showMsg('Preencha os campos obrigatórios (*).', 'error');
      return;
    }

    setActionInProgress(true);
    try {
      const created = await authService.createUserByAdmin({
        username: newAdminUsername.trim(),
        displayName: newAdminDisplayName.trim() || newAdminUsername.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        cargo: newAdminCargo.trim(),
        unitName: newAdminUnit.trim(),
        phone: newAdminPhone.trim(),
        department: newAdminDepartment.trim(),
        isAdmin: newAdminIsAdmin,
        role: newAdminIsAdmin ? 'admin' : 'user'
      });

      showMsg(`Usuário "${created.displayName}" cadastrado com sucesso!`, 'success');
      setIsCreatingUser(false);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao criar usuário.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Abrir modal de edição de usuário pelo Admin
  const handleOpenEditUser = (targetUser: UserProfile) => {
    setEditingTargetUser(targetUser);
    setEditAdminDisplayName(targetUser.displayName || '');
    setEditAdminUsername(targetUser.username || '');
    setEditAdminEmail(targetUser.email || '');
    setEditAdminCargo(targetUser.cargo || 'Inspetor(a) de Polícia');
    setEditAdminRegistration(targetUser.registrationNumber || '');
    setEditAdminUnit(targetUser.unitName || '1ª Delegacia Metropolitana de Maracanaú');
    setEditAdminPhone(targetUser.phone || '');
    setEditAdminDepartment(targetUser.department || 'Cartório de Oitivas');
    setEditAdminIsAdmin(targetUser.role === 'admin' || Boolean(targetUser.isAdmin));
    setEditAdminNewPassword('');
  };

  // Submeter edição de usuário pelo Admin
  const handleAdminEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTargetUser) return;

    setActionInProgress(true);
    try {
      const updated = await authService.updateUserByAdmin(editingTargetUser.uid, {
        displayName: editAdminDisplayName.trim(),
        username: editAdminUsername.trim().toLowerCase().replace(/[^a-z0-9_.]/g, ''),
        email: editAdminEmail.trim().toLowerCase(),
        cargo: editAdminCargo.trim(),
        registrationNumber: editAdminRegistration.trim(),
        unitName: editAdminUnit.trim(),
        phone: editAdminPhone.trim(),
        department: editAdminDepartment.trim(),
        isAdmin: editAdminIsAdmin,
        role: editAdminIsAdmin ? 'admin' : 'user',
        newPassword: editAdminNewPassword.trim() || undefined
      });

      // Se o usuário editado for o usuário atualmente logado, atualiza o app
      if (user && user.uid === editingTargetUser.uid) {
        onUpdateProfile(updated);
      }

      showMsg(`Usuário "${updated.displayName}" atualizado com sucesso!`, 'success');
      setEditingTargetUser(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao atualizar usuário.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Submeter exclusão de usuário pelo Admin
  const handleAdminDeleteUserSubmit = async () => {
    if (!deletingTargetUser) return;

    setActionInProgress(true);
    try {
      await authService.deleteUserByAdmin(deletingTargetUser.uid);
      showMsg(`Usuário "${deletingTargetUser.displayName || deletingTargetUser.username}" foi excluído do sistema.`, 'info');
      setDeletingTargetUser(null);
    } catch (err: any) {
      showMsg(err.message || 'Erro ao excluir usuário.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Filtered Users list for Admin
  const displayedUsers = allUsers.filter((u) => {
    const matchesRole = 
      adminRoleFilter === 'all' || 
      (adminRoleFilter === 'admin' && (u.role === 'admin' || u.isAdmin)) ||
      (adminRoleFilter === 'user' && u.role !== 'admin' && !u.isAdmin) ||
      (adminRoleFilter === 'duplicates' && duplicateUidSet.has(u.uid));

    if (!matchesRole) return false;

    if (!adminSearchQuery.trim()) return true;
    const q = adminSearchQuery.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.cargo && u.cargo.toLowerCase().includes(q)) ||
      (u.unitName && u.unitName.toLowerCase().includes(q))
    );
  });

  const adminCount = allUsers.filter(u => u.role === 'admin' || u.isAdmin).length;
  const userCount = allUsers.length - adminCount;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#110d1e] border-2 border-purple-600/60 rounded-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/80 my-auto flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b-2 border-purple-900/50 bg-[#161128] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center shadow-md ${
              isAdminUser 
                ? 'bg-gradient-to-br from-amber-500 to-purple-950 border-amber-400/60 text-amber-300'
                : 'bg-gradient-to-br from-purple-600 to-purple-950 border-purple-400/60 text-purple-200'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {isAdminUser ? 'Painel de Gestão & Perfil Policial' : 'Gerenciamento de Perfil & Segurança'}
                </h2>
                {isAdminUser ? (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    ADMINISTRADOR
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                    PCCE
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-300">
                {unitName || '1ª Delegacia Metropolitana de Maracanaú'} • {cargo || 'Servidor'}
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-purple-900/30 bg-[#130f22] px-6 overflow-x-auto shrink-0">
          <button
            id="tab-functional-profile"
            type="button"
            onClick={() => setActiveTab('functional')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'functional'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-purple-400" />
            <span>Dados Funcionais</span>
          </button>

          <button
            id="tab-account-profile"
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'account'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4 text-purple-400" />
            <span>E-mail & Workspace</span>
          </button>

          <button
            id="tab-security-profile"
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'security'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>Senha & Segurança</span>
          </button>

          <button
            id="tab-backup-data"
            type="button"
            onClick={() => setActiveTab('backup_data')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'backup_data'
                ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-950/10'
            }`}
          >
            <HardDriveDownload className="w-4 h-4 text-emerald-400" />
            <span>Backup & Prevenção de Perdas</span>
          </button>

          {/* ADMIN EXCLUSIVE TAB */}
          {isAdminUser && (
            <button
              id="tab-admin-users"
              type="button"
              onClick={() => setActiveTab('admin_users')}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition-colors shrink-0 cursor-pointer ${
                activeTab === 'admin_users'
                  ? 'border-amber-500 text-amber-300 bg-amber-950/20'
                  : 'border-transparent text-amber-400/70 hover:text-amber-300 hover:bg-amber-950/10'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Gerenciamento de Usuários (Admin)</span>
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded-md font-mono">
                {allUsers.length}
              </span>
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs flex items-center gap-2 border shrink-0 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : feedback.type === 'error'
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                : 'bg-purple-950/50 border-purple-500/40 text-purple-300'
          }`}>
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {feedback.type === 'info' && <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: DADOS FUNCIONAIS & PESSOAIS */}
        {/* ========================================================================= */}
        {activeTab === 'functional' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Foto e Identificação Rápida */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Foto de Perfil / Distintivo Policial</span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative">
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-950"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-purple-950/80 border-2 border-purple-500/50 flex items-center justify-center text-purple-300 font-bold text-xl shadow-lg shadow-purple-950">
                      {displayName ? displayName.substring(0, 2).toUpperCase() : 'OP'}
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full space-y-2">
                  <p className="text-[11px] text-zinc-300">
                    Selecione um distintivo funcional ou informe a URL de sua foto institucional:
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setPhotoURL(av.url)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                          photoURL === av.url 
                            ? 'bg-purple-600 border-purple-400 text-white'
                            : 'bg-[#120e20] border-purple-900/40 text-zinc-300 hover:bg-purple-950/40'
                        }`}
                      >
                        <img src={av.url} alt="" className="w-4 h-4 rounded-full object-cover" />
                        <span>{av.label}</span>
                      </button>
                    ))}
                    {photoURL && (
                      <button
                        type="button"
                        onClick={() => setPhotoURL('')}
                        className="px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    placeholder="Ou cole a URL da sua foto (Ex: https://...)"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dados Pessoais & Credenciais */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-purple-400" />
                <span>Identificação do Servidor</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome Completo do Servidor *
                  </label>
                  <input
                    id="profile-display-name"
                    type="text"
                    required
                    placeholder="Ex: Inspetor Marcos Vinícius de Sousa"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome de Usuário (Login) *
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      id="profile-username"
                      type="text"
                      required
                      placeholder="inspetor_silva"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Cargo / Função Policial
                  </label>
                  <input
                    id="profile-cargo"
                    type="text"
                    list="cargo-suggestions-list"
                    placeholder="Ex: Escrivão(ã) de Polícia"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <datalist id="cargo-suggestions-list">
                    {CARGO_SUGGESTIONS.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Matrícula Funcional
                  </label>
                  <input
                    id="profile-registration"
                    type="text"
                    placeholder="Ex: 300.123-1-A"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Lotação & Contato */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>Unidade Policial & Cartório</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Delegacia / Lotação Oficial
                  </label>
                  <input
                    id="profile-unit-name"
                    type="text"
                    placeholder="1ª Delegacia Metropolitana de Maracanaú"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Setor / Cartório
                  </label>
                  <input
                    id="profile-department"
                    type="text"
                    placeholder="Cartório 01 / Núcleo de Oitivas"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    E-mail Institucional (@policiacivil.ce.gov.br)
                  </label>
                  <input
                    id="profile-institutional-email"
                    type="email"
                    placeholder="servidor@policiacivil.ce.gov.br"
                    value={institutionalEmail}
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Telefone / WhatsApp Funcional
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      id="profile-phone"
                      type="text"
                      placeholder="(85) 3101-2830"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Catálogo de Delegados (DPC) Compartilhado */}
            {onOpenDelegadosModal && (
              <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Catálogo de Delegados (DPC)</h3>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Gerencie as autoridades policiais. Adicione, edite ou exclua DPCs compartilhados com toda a equipe.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenDelegadosModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-950/60 transition-all cursor-pointer shrink-0"
                >
                  <Shield className="w-4 h-4" />
                  <span>Gerenciar Delegados (DPC)</span>
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-400">
                Os dados são salvos na nuvem e sincronizados em todos os seus dispositivos.
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-profile"
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-950 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>

          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: E-MAIL & WORKSPACE */}
        {/* ========================================================================= */}
        {activeTab === 'account' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">E-mail Principal da Conta</h3>
                  <p className="text-xs text-zinc-400">Utilizado para login, notificações e sincronização no Firebase.</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  E-mail de Acesso
                </label>
                <input
                  id="profile-account-email"
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="delegaciammaracanau@gmail.com"
                  className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Atualizando...' : 'Atualizar E-mail da Conta'}</span>
                </button>
              </div>
            </div>

            {/* Google Workspace Connect */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Integração Google Workspace</h3>
                    <p className="text-xs text-zinc-400">Google Calendar, Google Drive e Gmail conectados à sua conta.</p>
                  </div>
                </div>

                {authService.hasGoogleWorkspaceAccess() ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full text-xs">
                    Não Conectado
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-300">
                Conecte seu Gmail para gerar intimações em PDF diretamente no Google Drive, enviar intimações por e-mail com 1 clique e adicionar audiências automaticamente à sua Google Agenda.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  id="btn-connect-google-workspace"
                  type="button"
                  onClick={handleConnectGoogle}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Conectar ou Revalidar Google Workspace</span>
                </button>

                {onOpenWorkspaceModal && (
                  <button
                    type="button"
                    onClick={onOpenWorkspaceModal}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#120e20] hover:bg-purple-950/40 text-purple-200 border border-purple-800/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Abrir Central Google Workspace</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SENHA & SEGURANÇA (Com exclusão da própria conta) */}
        {/* ========================================================================= */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Alterar Senha */}
            <form onSubmit={handleChangePassword} className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Alterar Senha de Acesso</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nova Senha
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    required
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    id="profile-confirm-password"
                    type="password"
                    required
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-purple-300/60">
                  Livre formato sem restrições arbitrárias.
                </span>
                <button
                  id="btn-update-password"
                  type="submit"
                  disabled={passLoading || !newPassword}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {passLoading ? 'Alterando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>

            {/* Recuperação por E-mail */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recuperação de Senha por E-mail</h3>
              </div>
              <p className="text-xs text-zinc-300">
                Esqueceu sua senha ou deseja redefini-la com segurança? Enviaremos um link de recuperação diretamente para o seu e-mail cadastrado (<strong>{accountEmail || 'seu e-mail'}</strong>).
              </p>

              <div className="pt-2 flex items-center justify-end">
                <button
                  id="btn-send-reset-email"
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#251e3a] hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{resetLoading ? 'Enviando link...' : 'Enviar Link de Recuperação para o E-mail'}</span>
                </button>
              </div>
            </div>

            {/* Exclusão da Própria Conta (Isolada, sem afetar outros usuários) */}
            <div className="bg-red-950/20 border border-red-900/40 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">Excluir Minha Conta</h3>
              </div>
              <p className="text-xs text-zinc-300">
                Exclui permanentemente sua conta de usuário, seus dados de perfil e seus agendamentos no banco de dados na nuvem. Esta operação é restrita à sua conta e <strong>não afeta a conta de outros usuários</strong>.
              </p>

              {showConfirmDeleteAccount ? (
                <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Tem certeza de que deseja deletar a sua conta permanentemente? Esta ação é irreversível.</span>
                  </p>
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDeleteAccount(false)}
                      disabled={deleteAccountLoading}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteMyAccount}
                      disabled={deleteAccountLoading}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deleteAccountLoading ? 'Excluindo conta...' : 'Sim, Excluir Minha Conta'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteAccount(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-700/50 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Minha Conta Permanentemente</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: BACKUP & PREVENÇÃO DE PERDA DE DADOS */}
        {/* ========================================================================= */}
        {activeTab === 'backup_data' && (
          <UserBackupPanel
            user={user}
            oitivas={oitivas}
            specialDates={specialDates}
            onDataRestored={onDataRestored}
            showToast={showMsg}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: GERENCIAMENTO TOTAL DE USUÁRIOS (ADMINISTRADOR ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'admin_users' && isAdminUser && (
          <div className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col">
            
            {/* Duplicates Alert Banner */}
            {duplicateGroups.length > 0 && (
              <div className="bg-gradient-to-r from-amber-950/60 via-[#23173d] to-purple-950/60 border-2 border-amber-500/70 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-amber-950/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 shadow">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        {duplicateGroups.length} Grupo(s) de Usuários Duplicados Detectado(s)
                      </h4>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/50 rounded-full">
                        {duplicateUidSet.size} contas com mesmo @usuário ou e-mail
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">
                      O sistema identificou contas redundantes. Você pode unificá-las para que todas as oitivas fiquem consolidadas em uma única conta oficial.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    id="btn-open-unify-duplicates-modal"
                    type="button"
                    onClick={() => {
                      setSelectedGroupForUnify(null);
                      setIsUnifyModalOpen(true);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-amber-950/50 transition-all cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4 stroke-[2.5]" />
                    <span>Revisar & Unificar Duplicados</span>
                  </button>
                </div>
              </div>
            )}

            {/* Admin Toolbar: Stats, Search, Filters, New User Button */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#181328] p-4 rounded-2xl border border-purple-900/40 shrink-0">
              
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 bg-[#110d1e] px-3 py-1.5 rounded-xl border border-purple-900/30">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-300 font-semibold">Total: {allUsers.length}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admins: {adminCount}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-950/30 px-2.5 py-1.5 rounded-xl border border-purple-500/30 text-purple-300 text-xs font-semibold">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span>Comuns: {userCount}</span>
                </div>
                {duplicateGroups.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/20 px-2.5 py-1.5 rounded-xl border border-amber-500/50 text-amber-300 text-xs font-bold animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Duplicados: {duplicateUidSet.size}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-1 max-w-lg justify-end flex-wrap sm:flex-nowrap">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, @usuario, cargo..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  {adminSearchQuery && (
                    <button
                      onClick={() => setAdminSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Role */}
                <select
                  value={adminRoleFilter}
                  onChange={(e: any) => setAdminRoleFilter(e.target.value)}
                  className="bg-[#110d1e] border border-purple-900/50 text-xs text-zinc-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todos os Papéis ({allUsers.length})</option>
                  <option value="admin">Apenas Admins ({adminCount})</option>
                  <option value="user">Apenas Comuns ({userCount})</option>
                  {duplicateGroups.length > 0 && (
                    <option value="duplicates">⚠️ Apenas Duplicados ({duplicateUidSet.size})</option>
                  )}
                </select>

                {/* Unificar Duplicados Button in Toolbar */}
                {duplicateGroups.length > 0 && (
                  <button
                    id="btn-admin-unify-duplicates"
                    type="button"
                    onClick={() => {
                      setSelectedGroupForUnify(null);
                      setIsUnifyModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer"
                    title="Unificar contas duplicadas no banco de dados"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Unificar ({duplicateGroups.length})</span>
                  </button>
                )}

                {/* Catálogo de Delegados Button */}
                {onOpenDelegadosModal && (
                  <button
                    id="btn-admin-manage-delegados"
                    type="button"
                    onClick={onOpenDelegadosModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#201838] hover:bg-purple-900/50 text-amber-300 border border-amber-500/40 font-semibold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer"
                    title="Gerenciar Catálogo Unificado de Delegados (DPC)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Catálogo DPC</span>
                  </button>
                )}

                {/* Novo Usuário Button */}
                <button
                  id="btn-admin-create-user"
                  type="button"
                  onClick={handleOpenCreateUser}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold rounded-xl text-xs shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Novo Usuário</span>
                </button>
              </div>
            </div>

            {/* Users List Table / Cards */}
            <div className="space-y-2.5 flex-1">
              {adminLoading ? (
                <div className="text-center py-12 text-zinc-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Carregando usuários do banco de dados na nuvem...</span>
                </div>
              ) : displayedUsers.length === 0 ? (
                <div className="text-center py-12 bg-[#161126] border border-purple-900/30 rounded-2xl text-zinc-400 text-xs space-y-2">
                  <Users className="w-8 h-8 text-purple-400/50 mx-auto" />
                  <p className="font-semibold text-zinc-300">Nenhum usuário encontrado com os filtros atuais.</p>
                  <p className="text-zinc-500 text-[11px]">Clique em "Novo Usuário" para cadastrar um novo integrante.</p>
                </div>
              ) : (
                displayedUsers.map((u) => {
                  const isTargetAdmin = u.role === 'admin' || Boolean(u.isAdmin);
                  const isSelf = user?.uid === u.uid;
                  const isDuplicate = duplicateUidSet.has(u.uid);
                  const isSelected = selectedUidsForManualMerge.includes(u.uid);

                  return (
                    <div 
                      key={u.uid}
                      className={`p-4 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
                        isSelected
                          ? 'bg-[#261845] border-amber-400 shadow-md ring-1 ring-amber-400/30'
                          : isDuplicate
                            ? 'bg-[#1a122e] border-amber-500/40 hover:border-amber-400/60'
                            : 'bg-[#161128] hover:bg-[#1c1633] border-purple-900/40 hover:border-purple-700/50'
                      }`}
                    >
                      {/* User Info & Checkbox */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUidsForManualMerge(prev => [...prev, u.uid]);
                            } else {
                              setSelectedUidsForManualMerge(prev => prev.filter(id => id !== u.uid));
                            }
                          }}
                          className="w-4 h-4 rounded border-purple-700 text-amber-500 focus:ring-amber-500 bg-[#0d0a18] cursor-pointer shrink-0"
                          title="Selecionar usuário para unificação manual"
                        />

                        {u.photoURL ? (
                          <img 
                            src={u.photoURL} 
                            alt="" 
                            className="w-10 h-10 rounded-xl object-cover border border-purple-500/40 shrink-0" 
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            isTargetAdmin 
                              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                              : 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                          }`}>
                            {u.displayName ? u.displayName.substring(0, 2).toUpperCase() : 'US'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs tracking-tight truncate">
                              {u.displayName || 'Sem Nome'}
                            </span>
                            {u.username && (
                              <span className="text-[11px] text-purple-400 font-mono">
                                @{u.username}
                              </span>
                            )}
                            {isTargetAdmin ? (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                ADMIN
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md text-[10px] font-medium">
                                USUÁRIO COMUM
                              </span>
                            )}
                            {isDuplicate && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                DUPLICADO
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md text-[10px] font-semibold">
                                VOCÊ
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 flex-wrap">
                            <span>{u.cargo || 'Inspetor(a)'}</span>
                            <span>•</span>
                            <span className="text-zinc-300">{u.email || 'Sem e-mail'}</span>
                            {u.phone && (
                              <>
                                <span>•</span>
                                <span>{u.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions for this user */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Quick Unify button for duplicate user */}
                        {isDuplicate && (
                          <button
                            type="button"
                            onClick={() => {
                              const matchedGroup = duplicateGroups.find(g => g.users.some(usr => usr.uid === u.uid));
                              setSelectedGroupForUnify(matchedGroup || null);
                              setIsUnifyModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Abrir painel de unificação para este usuário duplicado"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>Unificar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#251f38] hover:bg-purple-900/60 text-purple-200 border border-purple-700/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          title="Editar dados ou permissões deste usuário"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingTargetUser(u)}
                          className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded-xl transition-colors cursor-pointer"
                          title="Excluir este usuário permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Floating Manual Merge Bar */}
            {selectedUidsForManualMerge.length >= 2 && (
              <div className="sticky bottom-0 z-20 bg-[#1e133a] border-2 border-amber-500 p-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {selectedUidsForManualMerge.length} usuários selecionados para unificação manual
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUidsForManualMerge([])}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer font-medium"
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selectedUsersList = allUsers.filter(u => selectedUidsForManualMerge.includes(u.uid));
                      const manualGroup: DuplicateUserGroup = {
                        id: `manual_merge_${Date.now()}`,
                        matchType: 'manual',
                        matchedKey: 'Seleção Manual pelo Administrador',
                        users: selectedUsersList
                      };
                      setSelectedGroupForUnify(manualGroup);
                      setIsUnifyModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4 stroke-[2.5]" />
                    <span>Unificar Selecionados ({selectedUidsForManualMerge.length})</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-purple-900/40 bg-[#140f24] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-zinc-400">
            {isAdminUser 
              ? '👑 Modo Administrador Ativo • Gerenciamento completo de contas e banco de dados habilitado'
              : '🔒 Modo Servidor • Seus agendamentos e dados estão isolados com segurança no seu ambiente de trabalho'
            }
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADMIN - CRIAR NOVO USUÁRIO */}
      {/* ========================================================================= */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#140f26] border border-amber-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-purple-950 animate-in fade-in">
            <div className="p-5 border-b border-amber-500/30 bg-[#1c1533] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Criar Novo Usuário (Admin)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingUser(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateUserSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome de Usuário * (Login)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: inspetor_carlos"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo de Lima"
                    value={newAdminDisplayName}
                    onChange={(e) => setNewAdminDisplayName(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos@exemplo.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Senha Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Defina a senha de acesso"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    list="admin-cargo-list"
                    value={newAdminCargo}
                    onChange={(e) => setNewAdminCargo(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                  <datalist id="admin-cargo-list">
                    {CARGO_SUGGESTIONS.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(85) 3101-2830"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Lotação / Delegacia
                </label>
                <input
                  type="text"
                  value={newAdminUnit}
                  onChange={(e) => setNewAdminUnit(e.target.value)}
                  className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Opção Discreta de Administrador */}
              <div className="pt-1">
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-400/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newAdminIsAdmin}
                    onChange={(e) => setNewAdminIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-800 text-amber-500 focus:ring-amber-500 bg-[#0d0a18] cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${newAdminIsAdmin ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="text-xs text-zinc-200 font-medium">
                      Conceder Privilégios de Administrador Total
                    </span>
                  </div>
                  {newAdminIsAdmin && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md">
                      Poder Total
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{actionInProgress ? 'Cadastrando...' : 'Cadastrar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN - EDITAR USUÁRIO */}
      {/* ========================================================================= */}
      {editingTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#140f26] border border-purple-500/40 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-purple-950 animate-in fade-in">
            <div className="p-5 border-b border-purple-500/30 bg-[#1c1533] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Editar Usuário</h3>
                  <p className="text-[11px] text-purple-300/70">UID: {editingTargetUser.uid}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTargetUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminEditUserSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAdminDisplayName}
                    onChange={(e) => setEditAdminDisplayName(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nome de Usuário * (Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={editAdminUsername}
                    onChange={(e) => setEditAdminUsername(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={editAdminCargo}
                    onChange={(e) => setEditAdminCargo(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Matrícula Funcional
                  </label>
                  <input
                    type="text"
                    value={editAdminRegistration}
                    onChange={(e) => setEditAdminRegistration(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editAdminPhone}
                    onChange={(e) => setEditAdminPhone(e.target.value)}
                    className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Lotação / Delegacia
                </label>
                <input
                  type="text"
                  value={editAdminUnit}
                  onChange={(e) => setEditAdminUnit(e.target.value)}
                  className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Redefinição de Senha deste Usuário pelo Admin */}
              <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-2xl space-y-1.5">
                <label className="block text-[11px] font-semibold text-purple-200 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                  <span>Redefinir Senha deste Usuário (Opcional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Deixe em branco para manter a senha atual"
                  value={editAdminNewPassword}
                  onChange={(e) => setEditAdminNewPassword(e.target.value)}
                  className="w-full bg-[#0d0a18] border border-purple-900/60 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 block">
                  Se preenchido, a nova senha entrará em vigor imediatamente.
                </span>
              </div>

              {/* Toggle de Administrador */}
              <div>
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-400/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editAdminIsAdmin}
                    onChange={(e) => setEditAdminIsAdmin(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-800 text-amber-500 focus:ring-amber-500 bg-[#0d0a18] cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${editAdminIsAdmin ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="text-xs text-zinc-200 font-medium">
                      Status de Administrador do Sistema
                    </span>
                  </div>
                  {editAdminIsAdmin && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-md">
                      ADMIN
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setEditingTargetUser(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{actionInProgress ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN - CONFIRMAR EXCLUSÃO DE USUÁRIO */}
      {/* ========================================================================= */}
      {deletingTargetUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#160e1e] border border-red-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-red-950 animate-in fade-in">
            <div className="p-5 border-b border-red-500/30 bg-[#22101b] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Confirmar Exclusão de Usuário</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTargetUser(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-200">
                Tem certeza de que deseja excluir permanentemente o usuário <strong className="text-white font-bold">"{deletingTargetUser.displayName || deletingTargetUser.username}"</strong> ({deletingTargetUser.email || `@${deletingTargetUser.username}`})?
              </p>

              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-[11px] text-red-300/90 space-y-1">
                <p>• Os agendamentos e o perfil deste usuário serão removidos da nuvem.</p>
                <p>• As contas de outros servidores não serão afetadas.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-purple-900/30">
                <button
                  type="button"
                  onClick={() => setDeletingTargetUser(null)}
                  disabled={actionInProgress}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdminDeleteUserSubmit}
                  disabled={actionInProgress}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{actionInProgress ? 'Excluindo...' : 'Sim, Excluir Usuário'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN - UNIFICAR USUÁRIOS DUPLICADOS */}
      {/* ========================================================================= */}
      {isUnifyModalOpen && (
        <UnifyDuplicatesModal
          isOpen={isUnifyModalOpen}
          onClose={() => {
            setIsUnifyModalOpen(false);
            setSelectedGroupForUnify(null);
            setSelectedUidsForManualMerge([]);
          }}
          duplicateGroups={selectedGroupForUnify ? [selectedGroupForUnify] : duplicateGroups}
          allUsers={allUsers}
          initialSelectedGroup={selectedGroupForUnify}
          onUnificationComplete={(msg) => {
            showMsg(msg, 'success');
            setSelectedUidsForManualMerge([]);
          }}
        />
      )}

    </div>
  );
};
