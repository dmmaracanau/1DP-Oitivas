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
  onOpenDelegadosModal?: () => void;
  onOpenHolidaysModal?: () => void;
  isAdmin?: boolean;
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
  onOpenDelegadosModal,
  onOpenHolidaysModal,
  isAdmin = false,
  hasWorkspaceToken,
  syncStatus = 'connected',
  user,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0c0a14]/98 backdrop-blur-md border-b-2 border-purple-700/60 px-3 sm:px-6 py-2.5 transition-colors no-print shadow-xl shadow-purple-950/40">
      <div className="max-w-7xl mx-auto space-y-2.5">
        
        {/* ROW 1: Brand & Sync Status (Left) | Search (Center) | User / Entrar (Right) */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
          
          {/* Col 1: Identity & Unit */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-950 flex items-center justify-center border-2 border-purple-400/80 shadow-md shadow-purple-950/60">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-sm sm:text-base text-white tracking-tight leading-none">
                  Agenda de Oitivas
                </h1>
                <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black bg-purple-900/90 text-purple-200 border border-purple-400/60 rounded-md leading-none uppercase tracking-wider">
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
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md border ${
                    syncStatus === 'connected'
                      ? 'bg-emerald-950 text-emerald-200 border-emerald-400/80'
                      : syncStatus === 'syncing'
                        ? 'bg-amber-950 text-amber-200 border-amber-400/80 animate-pulse'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    syncStatus === 'connected' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-zinc-500'
                  }`} />
                  <span className="hidden xs:inline">{syncStatus === 'connected' ? 'Tempo Real' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Offline'}</span>
                </span>
              </div>
              <p className="text-xs text-purple-200/90 font-medium leading-tight mt-0.5 truncate max-w-[220px] sm:max-w-[320px]">
                {user?.unitName || '1ª Delegacia Metropolitana de Maracanaú'}
              </p>
            </div>
          </div>

          {/* Col 2: Global Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md order-3 md:order-2 w-full md:w-auto">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-300" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Buscar depoente, procedimento, CPF..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#171128] border-2 border-purple-600/60 focus:border-purple-300 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Col 3: User Status / Entrar Button */}
          <div className="flex items-center gap-2 shrink-0 order-2 md:order-3 ml-auto">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  id="btn-open-my-profile"
                  onClick={onOpenProfileModal}
                  className="flex items-center gap-2 p-1.5 hover:bg-[#1f1638] border-2 border-purple-700/60 hover:border-purple-400 rounded-xl transition-all text-left group cursor-pointer shadow-sm"
                  title="Gerenciar Perfil e Segurança"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Perfil'} 
                      className="w-7 h-7 rounded-lg object-cover border border-purple-400"
                    />
                  ) : (
                    <div 
                      className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-400 flex items-center justify-center text-purple-200 font-bold text-xs group-hover:bg-purple-900 transition-colors"
                    >
                      {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'OP'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-bold text-white leading-none max-w-[120px] truncate group-hover:text-purple-300 transition-colors">
                        {user.displayName || 'Servidor'}
                      </p>
                      {(user.role === 'admin' || user.isAdmin) && (
                        <span className="px-1 py-0.2 bg-amber-950 text-amber-200 border border-amber-400 rounded text-[8px] font-black">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-purple-300 leading-none mt-0.5 truncate max-w-[120px] font-medium">
                      {user.cargo || 'Perfil'}
                    </p>
                  </div>
                </button>

                <button
                  id="logout-btn"
                  onClick={onLogout}
                  className="p-2 text-zinc-300 hover:text-rose-200 hover:bg-rose-950 border-2 border-purple-900/60 hover:border-rose-500 rounded-xl transition-all cursor-pointer shadow-sm"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="login-btn"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-2 border-purple-400/80 rounded-xl text-xs font-black shadow-md shadow-purple-950/60 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Entrar</span>
              </button>
            )}
          </div>

        </div>

        {/* ROW 2: Compact Multi-Column Navigation & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t-2 border-purple-700/40">
          
          {/* Col 1: View Mode Toggles (Highlighted & Prominent) */}
          <div className="flex items-center bg-[#130e24] border-2 border-purple-400 p-1 rounded-2xl gap-1 shadow-lg shadow-purple-950/80">
            <button
              id="view-mode-month-btn"
              onClick={() => onViewChange('month')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer ${
                currentView === 'month'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                  : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-purple-200" />
              <span>Mês</span>
            </button>

            <button
              id="view-mode-week-btn"
              onClick={() => onViewChange('week')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer ${
                currentView === 'week'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                  : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <Columns className="w-4 h-4 text-purple-200" />
              <span>Semana</span>
            </button>

            <button
              id="view-mode-day-btn"
              onClick={() => onViewChange('day')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer ${
                currentView === 'day'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                  : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <Clock className="w-4 h-4 text-purple-200" />
              <span>Dia</span>
            </button>

            <button
              id="view-mode-list-btn"
              onClick={() => onViewChange('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-black transition-all cursor-pointer ${
                currentView === 'list'
                  ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white shadow-md shadow-purple-950 ring-2 ring-purple-300 scale-[1.02]'
                  : 'text-zinc-200 hover:text-white hover:bg-purple-900/60'
              }`}
            >
              <List className="w-4 h-4 text-purple-200" />
              <span>Lista</span>
            </button>
          </div>

          {/* Col 2 & 3 & 4: Quick Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Workspace Button */}
            <button
              id="google-workspace-nav-btn"
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Google Workspace (Drive, Gmail, Agenda)"
            >
              <span className={`w-2 h-2 rounded-full ${hasWorkspaceToken ? 'bg-emerald-400 ring-2 ring-emerald-950' : 'bg-amber-400 ring-2 ring-amber-950'}`}></span>
              <span>Google Workspace</span>
            </button>

            {/* Delegados (DPC) Button - Available for all users */}
            {onOpenDelegadosModal && (
              <button
                id="delegados-nav-btn"
                onClick={onOpenDelegadosModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-purple-900/60 text-purple-200 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Catálogo de Autoridades Policiais (DPC)"
              >
                <Shield className="w-3.5 h-3.5 text-purple-300" />
                <span>Delegados (DPC)</span>
              </button>
            )}

            {/* Admin Feriados & Fins de Semana Button */}
            {isAdmin && onOpenHolidaysModal && (
              <button
                id="admin-holidays-nav-btn"
                onClick={onOpenHolidaysModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a0c16] hover:bg-[#3d1220] text-red-300 hover:text-white border-2 border-red-500/80 hover:border-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Gerenciar Feriados e Fins de Semana (Admin)"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Feriados</span>
              </button>
            )}

            {/* Print Pauta Button */}
            <button
              id="print-pauta-btn"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-[#251e3d] text-zinc-100 hover:text-white border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Imprimir Pauta Oficial de Oitivas"
            >
              <Printer className="w-3.5 h-3.5 text-purple-300" />
              <span>Pauta do Dia</span>
            </button>

            {/* Profile Quick Button if user is logged in */}
            {user && (
              <button
                id="profile-badge-btn"
                onClick={onOpenProfileModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#171228] hover:bg-purple-900/60 text-purple-200 border-2 border-purple-600/70 hover:border-purple-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Configurar Perfil e Senha"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-300" />
                <span>Meu Perfil</span>
              </button>
            )}

            {/* Nova Oitiva Button */}
            <button
              id="header-new-oitiva-btn"
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-purple-950/80 border-2 border-purple-300/80 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Oitiva</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
