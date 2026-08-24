import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Printer, 
  Search, 
  User, 
  LogOut, 
  Shield, 
  Clock, 
  List, 
  CalendarDays, 
  Columns
} from 'lucide-react';
import { UserProfile } from '../types/oitiva';

interface NavbarProps {
  currentView: 'month' | 'week' | 'day' | 'list';
  onViewChange: (view: 'month' | 'week' | 'day' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewModal: () => void;
  onOpenPrintModal: () => void;
  onOpenWorkspaceModal: () => void;
  onOpenAuthModal: () => void;
  onOpenProfileModal: () => void;
  hasWorkspaceToken: boolean;
  syncStatus?: 'connected' | 'syncing' | 'offline';
  user: UserProfile | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onOpenNewModal,
  onOpenPrintModal,
  onOpenWorkspaceModal,
  onOpenAuthModal,
  onOpenProfileModal,
  hasWorkspaceToken,
  syncStatus = 'connected',
  user,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0c0a14]/90 backdrop-blur-md border-b border-purple-900/30 px-4 lg:px-8 py-3 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Unit info */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center border border-purple-400/30 shadow-lg shadow-purple-900/30">
              <Shield className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-lg text-white tracking-tight">
                  Agenda de Oitivas
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                  Cartório Digital
                </span>
                <span 
                  title={
                    syncStatus === 'connected' 
                      ? 'Banco de dados Firestore conectado em tempo real (Multi-dispositivos)' 
                      : syncStatus === 'syncing' 
                        ? 'Sincronizando com Firestore...' 
                        : 'Modo offline com cache local'
                  }
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : syncStatus === 'syncing'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'connected' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-zinc-500'
                  }`} />
                  {syncStatus === 'connected' ? 'Tempo Real Ativo' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                {user?.unitName || 'Delegacia Metropolitana de Maracanaú'}
              </p>
            </div>
          </div>

          {/* Mobile Quick Action Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-new-oitiva-btn"
              onClick={onOpenNewModal}
              className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-md shadow-purple-900/40"
              title="Nova Oitiva"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center: Search and View Navigation */}
        <div className="flex flex-1 max-w-xl w-full items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Buscar por depoente, procedimento, CPF..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#151221] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex bg-[#151221] border border-purple-900/40 p-1 rounded-xl">
            <button
              id="view-mode-month-btn"
              onClick={() => onViewChange('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'month'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Mês
            </button>
            <button
              id="view-mode-week-btn"
              onClick={() => onViewChange('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'week'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              Semana
            </button>
            <button
              id="view-mode-day-btn"
              onClick={() => onViewChange('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'day'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Dia
            </button>
            <button
              id="view-mode-list-btn"
              onClick={() => onViewChange('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'list'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-900/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
        </div>

        {/* Right side: Actions & User */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Google Workspace Hub Button */}
          <button
            id="google-workspace-nav-btn"
            onClick={onOpenWorkspaceModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#171324] hover:bg-purple-950/40 text-purple-300 hover:text-white border border-purple-800/40 rounded-xl text-xs font-medium transition-colors"
            title="Google Workspace (Drive, Gmail, Agenda)"
          >
            <span className={`w-2 h-2 rounded-full ${hasWorkspaceToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className="font-semibold">Google Workspace</span>
          </button>

          {/* Print Button */}
          <button
            id="print-pauta-btn"
            onClick={onOpenPrintModal}
            className="flex items-center gap-2 px-3 py-2 bg-[#171324] hover:bg-[#221c36] text-zinc-300 hover:text-white border border-purple-900/40 rounded-xl text-xs font-medium transition-colors"
            title="Imprimir Pauta de Oitivas"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">Pauta do Dia</span>
          </button>

          {/* New Hearing Button */}
          <button
            id="header-new-oitiva-btn"
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Oitiva</span>
          </button>

          {/* User / Auth Menu */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-purple-900/40">
              <button
                id="btn-open-my-profile"
                onClick={onOpenProfileModal}
                className="flex items-center gap-2 p-1.5 hover:bg-purple-950/40 rounded-xl transition-colors text-left group"
                title="Gerenciar Meu Perfil, Senha e Matrícula"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Perfil'} 
                    className="w-8 h-8 rounded-lg object-cover border border-purple-500/40 group-hover:border-purple-400 transition-colors"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-semibold text-xs group-hover:bg-purple-900 transition-colors"
                  >
                    {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                  </div>
                )}
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-zinc-200 leading-tight max-w-[130px] truncate group-hover:text-purple-300 transition-colors">
                    {user.displayName || 'Servidor'}
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-tight truncate max-w-[130px]">
                    {user.cargo || 'Meu Perfil'}
                  </p>
                </div>
              </button>

              <button
                id="profile-badge-btn"
                onClick={onOpenProfileModal}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-[#1a1528] hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 rounded-lg text-[11px] font-medium transition-colors"
                title="Configurar Perfil e Senha"
              >
                <User className="w-3 h-3" />
                <span>Perfil</span>
              </button>

              <button
                id="logout-btn"
                onClick={onLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors ml-0.5"
                title="Sair da Conta"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="login-btn"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#171324] hover:bg-purple-900/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-medium transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
