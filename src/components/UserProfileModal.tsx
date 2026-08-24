import React, { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { UserProfile } from '../types/oitiva';
import { authService } from '../services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenWorkspaceModal?: () => void;
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
  'Plantão Policial'
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
  onOpenWorkspaceModal
}) => {
  const [activeTab, setActiveTab] = useState<'functional' | 'account' | 'security'>('functional');
  
  // Profile Form States
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
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setCargo(user.cargo || 'Inspetor(a) de Polícia');
      setRegistrationNumber(user.registrationNumber || '');
      setInstitutionalEmail(user.institutionalEmail || '');
      setUnitName(user.unitName || 'Delegacia Metropolitana de Maracanaú');
      setPhone(user.phone || '');
      setDepartment(user.department || 'Cartório de Oitivas');
      setAccountEmail(user.email || 'delegaciammaracanau@gmail.com');
      setPhotoURL(user.photoURL || '');
    }
    setFeedback(null);
    setNewPassword('');
    setConfirmPassword('');
  }, [user, isOpen]);

  if (!isOpen) return null;

  const showMsg = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Salvar alterações de perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showMsg('O nome completo é obrigatório.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateUserProfile({
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

  // Alterar senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showMsg('A nova senha deve ter no mínimo 6 caracteres.', 'error');
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

  // Conectar com Google Workspace / Gmail
  const handleConnectGoogle = async () => {
    try {
      const res = await authService.loginWithGoogle();
      onUpdateProfile(res.profile);
      showMsg('Conta Google / Gmail conectada ao Workspace!', 'success');
    } catch (err: any) {
      showMsg('Não foi possível conectar com o Google no momento.', 'error');
    }
  };

  const hasWorkspace = authService.hasGoogleWorkspaceAccess();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#110d1e] border border-purple-900/50 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl shadow-purple-950/70 my-6">
        
        {/* Header */}
        <div className="p-5 border-b border-purple-900/40 bg-[#161128] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 border border-purple-400/40 flex items-center justify-center text-purple-200 shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Gerenciamento de Perfil & Segurança
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  PCCE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {unitName || 'Delegacia Metropolitana de Maracanaú'} • {cargo || 'Servidor'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl transition-colors hover:bg-purple-950/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-purple-900/30 bg-[#130f22] px-6">
          <button
            id="tab-functional-profile"
            type="button"
            onClick={() => setActiveTab('functional')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'functional'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-purple-400" />
            <span>Dados Funcionais & Pessoais</span>
          </button>

          <button
            id="tab-account-profile"
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mail className="w-4 h-4 text-purple-400" />
            <span>E-mail da Conta & Gmail</span>
          </button>

          <button
            id="tab-security-profile"
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-purple-500 text-purple-200 bg-purple-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>Senha & Recuperação</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : feedback.type === 'error'
                ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                : 'bg-blue-950/50 border-blue-500/40 text-blue-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab 1: Dados Funcionais & Pessoais */}
        {activeTab === 'functional' && (
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Nome Completo */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nome Completo do Servidor / Policial *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-display-name"
                    type="text"
                    required
                    placeholder="Ex: Dra. Renata Vasconcelos / Inspetor Marcos Lima"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Cargo / Função Policial */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Cargo / Função Policial
                </label>
                <input
                  id="profile-cargo-input"
                  type="text"
                  placeholder="Ex: Delegado(a), Escrivão(ã), Inspetor(a)"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  list="cargos-list"
                  className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <datalist id="cargos-list">
                  {CARGO_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              {/* Matrícula Funcional */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Matrícula Funcional (ID Policial)
                </label>
                <div className="relative">
                  <BadgeCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-matricula-input"
                    type="text"
                    placeholder="Ex: PCCE-304.881-2"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Lotação / Delegacia */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Lotação / Unidade Policial
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-unit-input"
                    type="text"
                    placeholder="Delegacia Metropolitana de Maracanaú"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* E-mail Institucional */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  E-mail Institucional (@policiacivil.ce.gov.br)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-inst-email-input"
                    type="email"
                    placeholder="servidor@policiacivil.ce.gov.br"
                    value={institutionalEmail}
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                    className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Telefone / WhatsApp de Contato
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="profile-phone-input"
                    type="text"
                    placeholder="(85) 98765-4321 ou (85) 3101-2830"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Cartório / Setor */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Setor / Cartório de Atuação
                </label>
                <input
                  id="profile-department-input"
                  type="text"
                  placeholder="Ex: Cartório de Oitivas, NUCRA, Plantão"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#181328] border border-purple-900/40 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-purple-900/30 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
              >
                Fechar
              </button>
              <button
                id="btn-save-profile"
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: E-mail da Conta & Conexão Gmail / Google Workspace */}
        {activeTab === 'account' && (
          <div className="p-6 space-y-6">
            
            {/* Informational Banner */}
            <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-900/40 rounded-xl text-purple-300 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white mb-1">
                    E-mail da Conta & Conexão com Gmail Pessoal / Corporativo
                  </h3>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    O <strong>E-mail da Conta</strong> é a sua credencial principal de segurança. Ele serve para:
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-zinc-300 list-disc list-inside">
                    <li><span className="text-purple-300 font-medium">Recuperação e redefinição de senha</span> caso você esqueça seu acesso.</li>
                    <li><span className="text-purple-300 font-medium">Conexão direta ao Gmail</span> para enviar lembretes e intimações de oitivas com um clique.</li>
                    <li><span className="text-purple-300 font-medium">Sincronização com o Google Drive e Agenda</span> da Delegacia.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Email Field & Update */}
            <div className="bg-[#181328] p-4 rounded-2xl border border-purple-900/40 space-y-3">
              <label className="block text-xs font-semibold text-zinc-200">
                E-mail da Conta / Gmail Pessoal
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    id="profile-account-email"
                    type="email"
                    required
                    placeholder="delegaciammaracanau@gmail.com ou seu.email@gmail.com"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/60 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 shadow-md shadow-purple-900/40"
                >
                  Atualizar E-mail
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">
                As mensagens de recuperação de senha e intimações automáticas serão associadas a este endereço.
              </p>
            </div>

            {/* Status of Google Workspace Connection */}
            <div className="bg-[#181328] p-4 rounded-2xl border border-purple-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Integração Google Workspace</span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                    hasWorkspace 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}>
                    {hasWorkspace ? 'Conectado e Autenticado' : 'Pendente de Conexão'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Drive (Termos de Oitiva), Gmail (Notificações) e Google Agenda.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-[#251e3a] hover:bg-purple-900/50 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{hasWorkspace ? 'Reconectar Gmail' : 'Conectar Conta Google'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
              >
                Concluir
              </button>
            </div>

          </div>
        )}

        {/* Tab 3: Senha & Recuperação */}
        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            
            {/* Password Change Form */}
            <form onSubmit={handleChangePassword} className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">Alterar Senha de Acesso</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Nova Senha (mínimo 6 caracteres)
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    required
                    placeholder="******"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
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
                    placeholder="******"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#110d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-zinc-400">
                  Dica: Utilize uma senha forte com letras e números.
                </span>
                <button
                  id="btn-update-password"
                  type="submit"
                  disabled={passLoading || !newPassword}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {passLoading ? 'Alterando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>

            {/* Password Recovery Option */}
            <div className="bg-[#181328] p-5 rounded-2xl border border-purple-900/40 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white">Recuperação de Senha por E-mail</h3>
              </div>
              <p className="text-[11px] text-zinc-300">
                Esqueceu sua senha ou deseja redefini-la com segurança? Enviaremos um link de recuperação diretamente para o seu e-mail cadastrado (<strong>{accountEmail || 'seu e-mail'}</strong>).
              </p>

              <div className="pt-2 flex items-center justify-end">
                <button
                  id="btn-send-reset-email"
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#251e3a] hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{resetLoading ? 'Enviando link...' : 'Enviar Link de Recuperação para o E-mail'}</span>
                </button>
              </div>
            </div>

            {/* Close footer */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
