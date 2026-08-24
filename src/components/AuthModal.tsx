import React, { useState } from 'react';
import { X, Shield, Lock, Mail, User, LogIn, CheckCircle2, Laptop2, Smartphone, AtSign } from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types/oitiva';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration Fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login Field (can be email or username)
  const [loginIdentifier, setLoginIdentifier] = useState('delegaciammaracanau@gmail.com');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(null);
    setLoading(true);

    try {
      let user: UserProfile;
      if (isRegistering) {
        if (!username.trim()) {
          throw new Error('Por favor, informe o Nome de Usuário.');
        }
        if (!fullName.trim()) {
          throw new Error('Por favor, informe o Nome Completo.');
        }
        if (!email.trim()) {
          throw new Error('Por favor, informe o E-mail de acesso.');
        }
        if (!password) {
          throw new Error('Por favor, informe a Senha.');
        }

        user = await authService.registerWithEmail(email.trim(), password, fullName.trim(), username.trim());
      } else {
        if (!loginIdentifier.trim() || !password) {
          throw new Error('Informe seu usuário ou e-mail e sua senha.');
        }
        user = await authService.loginWithEmail(loginIdentifier.trim(), password);
      }
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setResetSent(null);
    setLoading(true);
    try {
      const res = await authService.loginWithGoogle();
      onLoginSuccess(res.profile);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro no login com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-[92vw] max-w-3xl overflow-hidden shadow-2xl shadow-purple-950/70 my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isRegistering ? 'Criar Novo Usuário' : 'Acesso ao Cartório de Oitivas'}
              </h2>
              <p className="text-xs text-purple-300/70">
                1ª Delegacia Metropolitana de Maracanaú • PCCE
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-purple-950/50 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Pill */}
        <div className="bg-purple-950/40 border-b border-purple-900/30 px-6 py-3 flex items-center gap-3 text-xs text-purple-200 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0 text-purple-400">
            <Laptop2 className="w-4 h-4" />
            <span>↔</span>
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="text-xs leading-tight text-purple-200/90">
            Sincronização em tempo real ativa: acesse em qualquer computador ou smartphone para carregar suas oitivas.
          </span>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {resetSent && (
            <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{resetSent}</span>
            </div>
          )}

          {/* Google Workspace Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-5 bg-[#1b172a] hover:bg-[#252038] text-white border border-purple-500/30 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
              <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
            </svg>
            <span className="text-sm font-medium">Entrar com Conta Google</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-purple-900/30"></div>
            <span className="px-4 text-xs text-zinc-500 font-semibold uppercase">
              {isRegistering ? 'Preencha os dados do novo usuário' : 'ou com usuário / e-mail e senha'}
            </span>
            <div className="flex-1 border-t border-purple-900/30"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering ? (
              /* Criação de Usuário: 4 Campos Claros */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Nome de Usuário */}
                  <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1.5">
                      1. Nome de Usuário (Login) *
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="text"
                        required
                        placeholder="ex: inspetor_silva"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Identificador de login (letras, números ou _).
                    </span>
                  </div>

                  {/* 2. Nome Completo */}
                  <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1.5">
                      2. Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Marcos Vinícius de Sousa"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Nome que constará no cabeçalho e relatórios.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 3. E-mail */}
                  <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1.5">
                      3. E-mail de Acesso *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      Para notificações e recuperação de senha.
                    </span>
                  </div>

                  {/* 4. Senha */}
                  <div>
                    <label className="block text-xs font-medium text-purple-200 mb-1.5">
                      4. Senha de Acesso *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                      <input
                        type="password"
                        required
                        placeholder="Digite sua senha de acesso"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-purple-300/70 mt-1 block">
                      Livre criação sem limitações de formato.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Modo Login: Usuário/E-mail e Senha */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nome de Usuário ou E-mail
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="inspetor_silva ou email@exemplo.com"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-300">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!loginIdentifier || !loginIdentifier.includes('@')) {
                          setError('Informe um e-mail válido no campo de acesso para receber o link de recuperação.');
                          return;
                        }
                        try {
                          setLoading(true);
                          await authService.sendPasswordReset(loginIdentifier);
                          setError(null);
                          setResetSent(`Link de redefinição de senha enviado para: ${loginIdentifier}`);
                        } catch (err: any) {
                          setError(err.message || 'Erro ao enviar e-mail de recuperação.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="password"
                      required
                      placeholder="Sua senha de acesso"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/70 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm">
                {loading 
                  ? 'Processando...' 
                  : isRegistering 
                    ? 'Criar Conta de Usuário' 
                    : 'Entrar no Sistema'}
              </span>
            </button>
          </form>

          {/* Toggle Register/Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setResetSent(null);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              {isRegistering 
                ? 'Já possui conta? Clique para entrar com seu usuário ou e-mail' 
                : 'Não tem conta? Cadastrar novo usuário'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
