import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  LogIn, 
  Shield, 
  Mail, 
  AtSign, 
  CheckCircle2, 
  Laptop2, 
  Smartphone,
  Sparkles,
  ShieldCheck,
  Fingerprint
} from 'lucide-react';
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
  const [isAdmin, setIsAdmin] = useState(false);

  // Login Field (can be email or username)
  const [loginIdentifier, setLoginIdentifier] = useState('');

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

        user = await authService.registerWithEmail(email.trim(), password, fullName.trim(), username.trim(), isAdmin);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#120f1e] border-2 border-purple-600/60 rounded-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] overflow-hidden shadow-2xl shadow-purple-950/80 my-auto flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-purple-900/50 bg-[#161226] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-950 border-2 border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isRegistering ? 'Criar Novo Usuário' : 'Acesso ao Cartório de Oitivas'}
              </h2>
              <p className="text-xs text-purple-300/80">
                1ª Delegacia Metropolitana de Maracanaú • Polícia Civil do Ceará
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-300 hover:text-white hover:bg-purple-950/60 rounded-xl transition-colors cursor-pointer border border-purple-900/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Info Banner */}
        <div className="bg-purple-950/40 border-b border-purple-900/30 px-5 py-2.5 flex items-center gap-3 text-xs text-purple-200 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0 text-purple-400">
            <Laptop2 className="w-3.5 h-3.5" />
            <span>↔</span>
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] leading-tight text-purple-200/90">
            Sincronização em tempo real ativa: acesse em qualquer computador ou smartphone para carregar e assinar suas intimações.
          </span>
        </div>

        {/* Content: 2-Column Responsive Layout */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Branding, Google Login & Guidelines */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#181329] border border-purple-900/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Acesso Rápido Integrado
                </h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Utilize sua conta institucional do Google Workspace ou cadastre seu usuário funcional da delegacia.
              </p>

              {/* Google Workspace Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 bg-[#110d1e] hover:bg-purple-950/60 text-white border border-purple-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2s.7 5.5 1.9 7.9l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z" />
                </svg>
                <span>Entrar com Conta Google Workspace</span>
              </button>
            </div>

            <div className="bg-[#141024] border border-purple-900/30 rounded-2xl p-4 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2 text-purple-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Recursos Ativos</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-zinc-300">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Geração automática de Mandados em PDF (A4)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Disparo de Intimações WhatsApp (Texto + PDF)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Sincronização com Google Calendar, Drive e Gmail
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Credentials Form */}
          <div className="lg:col-span-7 space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resetSent}</span>
              </div>
            )}

            <div className="bg-[#171328] border border-purple-900/40 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/30">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isRegistering ? 'Cadastro de Novo Servidor' : 'Acesso com Usuário e Senha'}
                </span>
                <span className="text-[10px] text-purple-300 font-mono">
                  {isRegistering ? '4 Campos' : 'Login Seguro'}
                </span>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {isRegistering ? (
                  /* Cadastro */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-purple-200 mb-1">
                          1. Nome de Usuário (Login) *
                        </label>
                        <div className="relative">
                          <AtSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input
                            type="text"
                            required
                            placeholder="ex: inspetor_silva"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                            className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-purple-200 mb-1">
                          2. Nome Completo *
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input
                            type="text"
                            required
                            placeholder="Ex: Marcos Vinícius"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-purple-200 mb-1">
                          3. E-mail de Acesso *
                        </label>
                        <div className="relative">
                          <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input
                            type="email"
                            required
                            placeholder="seuemail@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-purple-200 mb-1">
                          4. Senha de Acesso *
                        </label>
                        <div className="relative">
                          <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                          <input
                            type="password"
                            required
                            placeholder="Defina sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#120e20] border border-purple-900/40 hover:border-purple-600/50 transition-all cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isAdmin}
                          onChange={(e) => setIsAdmin(e.target.checked)}
                          className="w-4 h-4 rounded border-purple-800 text-purple-600 focus:ring-purple-500 bg-[#0d0a18] cursor-pointer"
                        />
                        <Shield className={`w-3.5 h-3.5 ${isAdmin ? 'text-amber-400' : 'text-zinc-500'}`} />
                        <span className="text-xs text-zinc-300 font-medium">
                          Definir como Administrador do Sistema
                        </span>
                        {isAdmin && (
                          <span className="ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
                            Admin
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  /* Login */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                        Nome de Usuário ou E-mail
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          required
                          placeholder="inspetor_silva ou email@exemplo.com"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-zinc-300">
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
                          className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="password"
                          required
                          placeholder="Sua senha de acesso"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-[#100d1e] border border-purple-900/50 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/70 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {loading 
                      ? 'Processando...' 
                      : isRegistering 
                        ? 'Criar Conta de Usuário' 
                        : 'Entrar no Sistema'}
                  </span>
                </button>
              </form>

              {/* Alternar entre Login e Cadastro */}
              <div className="text-center pt-1 border-t border-purple-900/30">
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
                    ? 'Já possui conta? Clique para entrar' 
                    : 'Não tem conta? Cadastrar novo usuário'}
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
