import React, { useState } from 'react';
import { X, Shield, Lock, Mail, User, LogIn, Sparkles, CheckCircle2 } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('delegaciammaracanau@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);

    try {
      let user: UserProfile;
      if (isRegistering) {
        user = await authService.registerWithEmail(email, password || '123456', name);
      } else {
        user = await authService.loginWithEmail(email, password || '123456');
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
    setLoading(true);
    try {
      const user = await authService.loginWithGoogle();
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro no login com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await authService.loginAsGuest('Delegacia de Maracanaú');
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="bg-[#120f1e] border border-purple-900/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-purple-950/60 my-8">
        
        {/* Header */}
        <div className="p-5 border-b border-purple-900/40 bg-[#161226] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isRegistering ? 'Criar Acesso ao Sistema' : 'Acesso ao Cartório de Oitivas'}
              </h2>
              <p className="text-xs text-purple-300/70">
                Delegacia Metropolitana de Maracanaú
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Fast One-Click Staff Login */}
          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-950/70 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-purple-200" />
            <span>Entrar como Plantão / Cartório de Maracanaú</span>
          </button>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-purple-900/30"></div>
            <span className="px-3 text-[11px] text-zinc-500 font-semibold uppercase">ou com credenciais</span>
            <div className="flex-1 border-t border-purple-900/30"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isRegistering && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nome Completo / Cargo
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Inspetor Marcos / Escrivã Fabiana"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                E-mail Institucional ou Pessoal
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  placeholder="delegaciammaracanau@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300">
                  Senha de Acesso
                </label>
                {!isRegistering && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        setError('Informe o e-mail para receber o link de recuperação.');
                        return;
                      }
                      try {
                        setLoading(true);
                        await authService.sendPasswordReset(email);
                        setError(null);
                        alert(`Link de recuperação de senha enviado para: ${email}`);
                      } catch (err: any) {
                        setError(err.message || 'Erro ao enviar e-mail de recuperação.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#171326] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#1e1933] hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Entrando...' : isRegistering ? 'Criar Conta' : 'Acessar Conta'}</span>
            </button>
          </form>

          {/* Toggle Register/Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              {isRegistering ? 'Já possui conta? Clique para entrar' : 'Não tem conta? Cadastre seu acesso'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
