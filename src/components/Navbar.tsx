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
  Columns,
  Sparkles,
  SlidersHorizontal
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
    <header className="sticky top-0 z-30 bg-[#0c0a14]/95 backdrop-blur-md border-b border-purple-900/30 px-3 sm:px-6 py-2 transition-colors no-print">
      <div className="max-w-7xl mx-auto space-y-2">
        
        {/* ROW 1: Brand & Sync Status (Left) | Search (Center) | User / Entrar (Right) */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2.5">
          
          {/* Col 1: Identity & Unit */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center border border-purple-400/30 shadow-md shadow-purple-950/50">
              <Shield className="w-4 h-4 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight leading-none">
                  Agenda de Oitivas
                </h1>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full leading-none">
                  Cartório Digital
                </span>
                <span 
                  title={
                    syncStatus === 'connected' 
                      ? 'Banco de dados Firestore sincronizado em tempo real' 
                      : syncStatus === 'syncing' 
                        ? 'Sincronizando com Firestore...' 
                        : 'Modo offline'
                  }
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium rounded-full border ${
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
                  <span className="hidden xs:inline">{syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5 truncate max-w-[200px] sm:max-w-[280px]">
                {user?.unitName || '1ª Delegacia Metropolitana de Maracanaú'}
              </p>
            </div>
          </div>

          {/* Col 2: Global Search Bar */}
          <div className="relative flex-1 min-w-[180px] max-w-md order-3 md:order-2 w-full md:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Buscar depoente, procedimento, CPF..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#151221] border border-purple-900/40 focus:border-purple-500 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Col 3: User Status / Entrar Button */}
          <div className="flex items-center gap-1.5 shrink-0 order-2 md:order-3 ml-auto">
            {user ? (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-open-my-profile"
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 p-1 hover:bg-purple-950/40 rounded-xl transition-colors text-left group cursor-pointer"
                  title="Gerenciar Perfil e Segurança"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Perfil'} 
                      className="w-7 h-7 rounded-lg object-cover border border-purple-500/40 group-hover:border-purple-400 transition-colors"
                    />
                  ) : (
                    <div 
                      className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-500/40 flex items-center justify-center text-purple-300 font-semibold text-[11px] group-hover:bg-purple-900 transition-colors"
                    >
                      {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-semibold text-zinc-200 leading-none max-w-[110px] truncate group-hover:text-purple-300 transition-colors">
                      {user.displayName || 'Servidor'}
                    </p>
                    <p className="text-[9px] text-zinc-400 leading-none mt-0.5 truncate max-w-[110px]">
                      {user.cargo || 'Perfil'}
                    </p>
                  </div>
                </button>

                <button
                  id="logout-btn"
                  onClick={onLogout}
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white border border-purple-500/40 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>

        </div>

        {/* ROW 2: Compact Multi-Column Navigation & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-purple-900/20">
          
          {/* Col 1: View Mode Toggles (Highlighted & Prominent) */}
          <div className="flex items-center bg-[#130e24] border-2 border-purple-500/50 p-1 rounded-2xl gap-1 shadow-lg shadow-purple-950/70">
            <button
              id="view-mode-month-btn"
              onClick={() => onViewChange('month')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                currentView === 'month'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300/50 scale-[1.02]'
                  : 'text-zinc-300 hover:text-white hover:bg-purple-900/40'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-purple-200" />
              <span>Mês</span>
            </button>

            <button
              id="view-mode-week-btn"
              onClick={() => onViewChange('week')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                currentView === 'week'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300/50 scale-[1.02]'
                  : 'text-zinc-300 hover:text-white hover:bg-purple-900/40'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-purple-200" />
              <span>Semana</span>
            </button>

            <button
              id="view-mode-day-btn"
              onClick={() => onViewChange('day')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                currentView === 'day'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300/50 scale-[1.02]'
                  : 'text-zinc-300 hover:text-white hover:bg-purple-900/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-200" />
              <span>Dia</span>
            </button>

            <button
              id="view-mode-list-btn"
              onClick={() => onViewChange('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                currentView === 'list'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-1 ring-purple-300/50 scale-[1.02]'
                  : 'text-zinc-300 hover:text-white hover:bg-purple-900/40'
              }`}
            >
              <List className="w-3.5 h-3.5 text-purple-200" />
              <span>Lista</span>
            </button>
          </div>

          {/* Col 2 & 3 & 4: Quick Action Buttons Group */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Google Workspace Button */}
            <button
              id="google-workspace-nav-btn"
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161224] hover:bg-purple-950/50 text-purple-300 hover:text-white border border-purple-800/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Google Workspace (Drive, Gmail, Agenda)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasWorkspaceToken ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span>Google Workspace</span>
            </button>

            {/* Print Pauta Button */}
            <button
              id="print-pauta-btn"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161224] hover:bg-[#221c36] text-zinc-300 hover:text-white border border-purple-900/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              title="Imprimir Pauta Oficial de Oitivas"
            >
              <Printer className="w-3 h-3 text-purple-400" />
              <span>Pauta do Dia</span>
            </button>

            {/* Profile Quick Button if user is logged in */}
            {user && (
              <button
                id="profile-badge-btn"
                onClick={onOpenProfileModal}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#161224] hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                title="Configurar Perfil e Senha"
              >
                <SlidersHorizontal className="w-3 h-3 text-purple-400" />
                <span>Meu Perfil</span>
              </button>
            )}

            {/* Nova Oitiva Button */}
            <button
              id="header-new-oitiva-btn"
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-950/60 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Oitiva</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
